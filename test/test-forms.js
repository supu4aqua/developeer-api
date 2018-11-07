const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

// set up test configuration
const expect = chai.expect;
chai.use(chaiHttp);

// import models, server, and configuration variables
const { Form } = require('../forms/models');
const { User } = require('../users/models');
const { createAuthToken } = require('../auth/createAuthToken');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

// clear test database
const tearDownDb = () => {
    return mongoose.connection.dropDatabase();
}

describe('Forms API', () => {
    const name = 'Test form 1';
    const projectUrl = 'http://www.google.com';
    const questions = ['Test question 1', 'Test question 2', 'Test question 3'];

    const nameUpdated = 'Test form 2';
    const projectUrlUpdated = 'http://www.yahoo.com';
    const questionsUpdated = ['Test question 1 v2', 'Test question 2 v2', 'Test question 3 v2'];
    const pendingRequests = 5;

    const versions = {
        questions: [...questions]
    };

    const userData = {
        username: 'testuser',
        password: 'testpassword'
    };

    before(() => {
        return runServer(TEST_DATABASE_URL);
    });

    after(() => {
        return closeServer();
    });

    afterEach(() => {
        return tearDownDb();
    });

    describe.only('GET /api/forms/toreview', () => {
        it('Should return a form with pending requests', () => {
            const forms = [];
            return User.create(userData)
                .then(user => {
                    for (let i = 0; i < 5; i++) {
                        forms.push({ author: user._id, name, projectUrl, pendingRequests: i });
                    }
                    return Form.insertMany(forms)
                        .then(() => {
                            return chai.request(app)
                                .get(`/api/forms/toreview`)
                                .then(res => {
                                    expect(res).to.have.status(200);
                                    expect(res).to.be.json;
                                    expect(res.body).to.be.an('object');
                                    expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests');
                                    expect(res.body.form.pendingRequests).to.be.greaterThan(0);
                                });
                        });
                });
        });
        it('Should not return form if author is req.query.userId', () => {
            let author;
            const forms = [];
            return User.create(userData)
                .then(user => {
                    author = user._id;
                    for (let i = 0; i < 5; i++) {
                        forms.push({ author: user._id, name, projectUrl, pendingRequests: i });
                    }
                    return Form.insertMany(forms)
                        .then(() => {
                            return chai.request(app)
                                .get(`/api/forms/toreview?userId=${author}`)
                                .then(res => {
                                    expect(res).to.have.status(404);
                                    expect(res.body.message).to.equal('No forms found');
                                });
                        });
                });
        });
    });


    describe('GET /api/forms/:id', () => {
        it('Should reject requests if form id not found in database', () => {
            // REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
            //  const token = createAuthToken(userData);
            return chai.request(app)
                .get(`/api/forms/000000000000`)
                // REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
                // .set('authorization', `Bearer ${token}`)
                .then(res => {
                    expect(res).to.have.status(404);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.message).to.equal('Form not found');
                });
        });

        // THIS TEST REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
        // it('Should reject requests if form author is not the same as requesting user', () => {
        //     let author;
        //     let token;
        //     let formId;
        //     return User.create(userData)
        //         .then(user => {
        //             author = ObjectId('000000000000');
        //             userData.id = user.id;
        //             token = createAuthToken(userData);
        //             return Form.create({ author: ObjectId(author), name, projectUrl, versions })
        //                 .then((form) => {
        //                     formId = form._id;
        //                     return chai.request(app)
        //                         .get(`/api/forms/${formId}`)
        //                         .set('authorization', `Bearer ${token}`)
        //                 })
        //                 .then(res => {
        //                     expect(res).to.have.status(401);
        //                     expect(res.body.message).to.equal(`Form author id (${author}) and JWT payload user id (${userData.id}) must match`);
        //                 });
        //         });
        // });

        it('Should read form with specified id from database', () => {

            let author;
            // REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
            //  let token;
            let formId;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    // REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
                    // token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            formId = form._id;
                            return chai.request(app)
                                .get(`/api/forms/${formId}`)
                            // REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
                            //.set('authorization', `Bearer ${token}`)
                        })
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res).to.be.json;
                            expect(res.body).to.be.an('object');
                            expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests');
                            expect(res.body.form._id).to.equal(String(formId));
                            expect(res.body.form.author).to.equal(author);
                            expect(res.body.form.name).to.equal(name);
                            expect(res.body.form.projectUrl).to.equal(projectUrl);
                            expect(res.body.form.versions[0]).to.include.keys('_id', 'questions', 'date');
                            expect(res.body.form.versions[0].questions).to.deep.equal(questions);
                        });
                });
        });
    });

    describe('POST /api/forms', () => {
        it('Should reject requests with missing name', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ projectUrl, questions })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('name');
                });
        });
        it('Should reject requests with missing projectUrl', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, questions })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('projectUrl');
                });
        });
        it('Should reject requests with missing questions', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should reject requests with non-string name', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name: 1, projectUrl, questions })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('name');
                });
        });
        it('Should reject requests with non-string projectUrl', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl: 1, questions })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('projectUrl');
                });
        });
        it('Should reject requests with non-array questions', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions: 'questions' })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should reject requests with array of non-string questions', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions: [1, 2, 3] })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should create a new form', () => {

            const token = createAuthToken(userData);
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions })
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests');
                    expect(res.body.form.name).to.equal(name);
                    expect(res.body.form.projectUrl).to.equal(projectUrl);
                    expect(res.body.form.versions[0]).to.include.keys('_id', 'questions', 'date');
                    expect(res.body.form.versions[0].questions).to.deep.equal(questions);

                    return Form.findById(res.body.form._id);
                })
                .then(form => {
                    expect(form.name).to.equal(name);
                    expect(form.projectUrl).to.equal(projectUrl);
                    expect(form.versions[0].questions).to.deep.equal(questions);
                });
        });
    });

    describe('PUT /api/forms/:id', () => {

        it('Should reject requests with missing id', () => {
            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('id');
                                });
                        });
                })
        });

        it('Should reject requests with missing name', () => {
            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('name');
                                });
                        });
                })
        });
        it('Should reject requests with missing projectUrl', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('projectUrl');
                                });
                        });
                })
        });
        it('Should reject requests with missing questions', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('questions');
                                });
                        });
                })
        });

        it('Should reject requests with missing pending requests', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('pendingRequests');
                                });
                        });
                })
        });
        it('Should reject requests with non-string name', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: 1,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                                    expect(res.body.location).to.equal('name');
                                });
                        });
                })
        });
        it('Should reject requests with non-string projectUrl', () => {
            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: 1,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                                    expect(res.body.location).to.equal('projectUrl');
                                });
                        });
                })
        });
        it('Should reject requests with non-array questions', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: 'Non-array questions'
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                                    expect(res.body.location).to.equal('questions');
                                });
                        });
                })
        });
        it('Should reject requests with array of non-string questions', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: [1, 2, 3]
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                                    expect(res.body.location).to.equal('questions');
                                });
                        });
                })
        });

        it('Should reject requests with non-number pendingRequest', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests: "1",
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected number');
                                    expect(res.body.location).to.equal('pendingRequests');
                                });
                        });
                })
        });

        it('Should reject requests if form author is not the same as requesting user', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = ObjectId('000000000000');
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author, name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(401);
                                    expect(res.body.message).to.equal(`Form author id (${author}) and JWT payload user id (${userData.id}) must match`);
                                });
                        });
                })
        });
        it('Should update a form', () => {

            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .put(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    id: formId,
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(200);
                                    expect(res).to.be.json;
                                    expect(res.body).to.be.an('object');
                                    expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests');
                                    expect(res.body.form._id).to.equal(String(formId));
                                    expect(res.body.form.author).to.equal(author);
                                    expect(res.body.form.name).to.equal(nameUpdated);
                                    expect(res.body.form.projectUrl).to.equal(projectUrlUpdated);
                                    expect(res.body.form.versions[0]).to.include.keys('_id', 'questions', 'date');
                                    expect(res.body.form.versions[0].questions).to.deep.equal(questions);
                                    expect(res.body.form.versions[1]).to.include.keys('_id', 'questions', 'date');
                                    expect(res.body.form.versions[1].questions).to.deep.equal(questionsUpdated);

                                    return Form.findById(res.body.form._id);
                                })
                                .then(form => {
                                    expect(form.name).to.equal(nameUpdated);
                                    expect(form.projectUrl).to.equal(projectUrlUpdated);
                                    expect(form.pendingRequests).to.equal(pendingRequests);
                                    expect(form.versions[1].questions).to.deep.equal(questionsUpdated);
                                });
                        });
                })
        });
    });
});