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
    const overview = 'Test overview';

    const nameUpdated = 'Test form 2';
    const projectUrlUpdated = 'http://www.yahoo.com';
    const questionsUpdated = ['Test question 1 v2', 'Test question 2 v2', 'Test question 3 v2'];
    const overviewUpdated = 'Test overview v2';
    const pendingRequests = 5;

    const versions = {
        questions: [...questions]
    };

    const userData = {
        username: 'testuser',
        password: 'testpassword'
    };

    const userData2 = {
        username: 'testuser2',
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

    describe('GET /api/forms/toreview', () => {
        it('Should return a form with pending requests', () => {
            const forms = [];
            return User.create(userData)
                .then(user => {
                    for (let i = 0; i < 5; i++) {
                        forms.push({ author: user._id, name, projectUrl, pendingRequests: i, overview });
                    }
                    return Form.insertMany(forms)
                        .then(() => {
                            return User.create(userData2)
                                .then(user => {
                                    const token = createAuthToken({ ...userData2, id: user._id });
                                    return chai.request(app)
                                        .get(`/api/forms/toreview`)
                                        .set('authorization', `Bearer ${token}`)
                                        .then(res => {
                                            expect(res).to.have.status(200);
                                            expect(res).to.be.json;
                                            expect(res.body).to.be.an('object');
                                            expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests', 'overview');
                                            expect(res.body.form.pendingRequests).to.be.greaterThan(0);
                                        });
                                });
                        });
                });
        });
        it('Should not return form if author is requesting user', () => {
            let authorId;
            const forms = [];
            return User.create(userData)
                .then(user => {
                    authorId = user._id;
                    for (let i = 0; i < 5; i++) {
                        forms.push({ author: user._id, name, projectUrl, pendingRequests: i, overview });
                    }
                    return Form.insertMany(forms)
                        .then(() => {
                            const token = createAuthToken({ ...userData, id: authorId });
                            return chai.request(app)
                                .get(`/api/forms/toreview`)
                                .set('authorization', `Bearer ${token}`)
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
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
                            expect(res.body.form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests', 'overview');
                            expect(res.body.form._id).to.equal(String(formId));
                            expect(res.body.form.author).to.equal(author);
                            expect(res.body.form.name).to.equal(name);
                            expect(res.body.form.overview).to.equal(overview);
                            expect(res.body.form.projectUrl).to.equal(projectUrl);
                            expect(res.body.form.versions[0]).to.include.keys('_id', 'questions', 'date');
                            expect(res.body.form.versions[0].questions).to.deep.equal(questions);
                        });
                });
        });
    });

    describe('POST /api/forms', () => {
        let id = '';

        beforeEach(function () {
            return User.hashPassword(userData.password).then(password => {
                return User.create({
                    username: userData.username,
                    password
                });
            }).then(user => id = user.id);
        });

        it('Should reject requests with missing name', () => {
            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ projectUrl, questions, overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('name');
                });
        });
        it('Should reject requests with missing projectUrl', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, questions, overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('projectUrl');
                });
        });
        it('Should reject requests with missing overview', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, questions, projectUrl })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('overview');
                });
        });
        it('Should reject requests with missing questions', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should reject requests with non-string name', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name: 1, projectUrl, questions, overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('name');
                });
        });
        it('Should reject requests with non-string overview', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions, overview: 1 })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('overview');
                });
        });
        it('Should reject requests with non-string projectUrl', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl: 1, questions, overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('projectUrl');
                });
        });
        it('Should reject requests with non-array questions', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions: 'questions', overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should reject requests with array of non-string questions', () => {

            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions: [1, 2, 3], overview })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                    expect(res.body.location).to.equal('questions');
                });
        });
        it('Should create a new form', () => {
            const token = createAuthToken({ ...userData, id });
            return chai.request(app)
                .post('/api/forms')
                .set('authorization', `Bearer ${token}`)
                .send({ name, projectUrl, questions, overview })
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.id).to.equal(id);
                    const form = res.body.forms[0];
                    expect(form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests', 'overview');
                    expect(form.name).to.equal(name);
                    expect(form.projectUrl).to.equal(projectUrl);
                    expect(form.overview).to.equal(overview);
                    expect(form.versions[0]).to.include.keys('_id', 'questions', 'date');
                    expect(form.versions[0].questions).to.deep.equal(questions);

                    return Form.findById(form._id);
                })
                .then(form => {
                    expect(form.name).to.equal(name);
                    expect(form.overview).to.equal(overview);
                    expect(form.projectUrl).to.equal(projectUrl);
                    expect(form.versions[0].questions).to.deep.equal(questions);

                    formId = form._id;
                    return User.findById(form.author);
                }).then(user => {
                    expect(user.forms[0]._id).to.deep.equal(formId);
                });
        });
    });

    describe('PATCH /api/forms/:id', () => {
        it('Should reject requests with illegal fields', () => {
            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    illegalField: "illegal"
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field not allowed');
                                    expect(res.body.location).to.equal('illegalField');
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    name: 1
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    projectUrl: 1
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
        it('Should reject requests with non-string overview', () => {
            let author;
            let token;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    overview: 1
                                })
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                                    expect(res.body.location).to.equal('overview');
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
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
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    pendingRequests: "1"
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
            let userId;
            return User.create(userData)
                .then(user => {
                    author = ObjectId('000000000000');
                    userId = user.id;
                    token = createAuthToken({ ...userData, id: userId });
                    return Form.create({ author, name, projectUrl, versions, overview })
                        .then((form) => {
                            const formId = form._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(res => {
                                    expect(res).to.have.status(401);
                                    expect(res.body.message).to.equal(`Unauthorized: Request user id (${userId}) and form author id (000000000000) must match`);
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
                    token = createAuthToken({ ...userData, id: author });
                    // return Form.create({ author, name, projectUrl, versions })
                    return chai.request(app)
                        .post('/api/forms/')
                        .set('authorization', `Bearer ${token}`)
                        .send({ name, projectUrl, questions, overview })
                        .then(res => {
                            const formId = res.body.forms[0]._id;
                            return chai.request(app)
                                .patch(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({
                                    name: nameUpdated,
                                    projectUrl: projectUrlUpdated,
                                    pendingRequests,
                                    questions: questionsUpdated,
                                    overview: overviewUpdated
                                })
                                .then(res => {
                                    expect(res).to.have.status(200);
                                    expect(res).to.be.json;
                                    expect(res.body).to.be.an('object');
                                    expect(res.body.id).to.equal(String(user._id));
                                    expect(res.body.credit).to.equal(-pendingRequests);

                                    const form = res.body.forms[0];
                                    expect(form).to.include.keys('_id', 'author', 'name', 'projectUrl', 'versions', 'created', 'pendingRequests', 'overview');
                                    expect(form._id).to.equal(String(formId));
                                    expect(form.author).to.equal(author);
                                    expect(form.name).to.equal(nameUpdated);
                                    expect(form.overview).to.equal(overviewUpdated);
                                    expect(form.projectUrl).to.equal(projectUrlUpdated);
                                    expect(form.versions[0]).to.include.keys('_id', 'questions', 'date');
                                    expect(form.versions[0].questions).to.deep.equal(questions);
                                    expect(form.versions[1]).to.include.keys('_id', 'questions', 'date');
                                    expect(form.versions[1].questions).to.deep.equal(questionsUpdated);

                                    return Form.findById(form._id);
                                })
                                .then(form => {
                                    expect(form.name).to.equal(nameUpdated);
                                    expect(form.projectUrl).to.equal(projectUrlUpdated);
                                    expect(form.overview).to.equal(overviewUpdated);
                                    expect(form.pendingRequests).to.equal(pendingRequests);
                                    expect(form.versions[1].questions).to.deep.equal(questionsUpdated);
                                });
                        });
                })
        });
    });

    describe('DELETE /api/forms/:id', () => {
        it('Should delete forms with specified id', () => {

            let token;
            let formId;
            return User.create(userData)
                .then(user => {
                    author = user._id;
                    token = createAuthToken({ ...userData, id: user._id });
                    return chai.request(app)
                        .post('/api/forms')
                        .set('authorization', `Bearer ${token}`)
                        .send({ name, projectUrl, questions, overview })
                        .then(res => {
                            formId = res.body.forms[0]._id;
                            return User.findById(res.body.id)
                        })
                        .then(user => {
                            expect(String(user.forms[0]._id)).to.equal(formId);
                            return chai.request(app)
                                .delete(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({ id: formId })
                                .then(res => {
                                    expect(res).to.have.status(200);
                                    expect(res.body.forms).to.deep.equal([]);
                                    return Form.findById(formId)
                                })
                                .then(form => {
                                    expect(form).to.be.null;
                                });
                        })
                });
        });
        it('Should reject requests with missing id', () => {

            let author;
            let token;
            let formId;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            formId = form._id;
                            return chai.request(app)
                                .delete(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(res => {
                                    expect(res).to.have.status(422);
                                    expect(res.body.reason).to.equal('ValidationError');
                                    expect(res.body.message).to.equal('field missing');
                                    expect(res.body.location).to.equal('id');
                                });
                        });
                });
        });
        it('Should reject requests if form id in params does not match id in body', () => {

            let author;
            let token;
            let formId;
            return User.create(userData)
                .then(user => {
                    author = user.id;
                    userData.id = user.id;
                    token = createAuthToken(userData);
                    return Form.create({ author: ObjectId(author), name, projectUrl, versions, overview })
                        .then((form) => {
                            formId = form._id;
                            return chai.request(app)
                                .delete(`/api/forms/${formId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({ id: '000000000000' })
                                .then(res => {
                                    expect(res).to.have.status(401);
                                    expect(res.body.message).to.equal(`Request path id (${formId}) and request body id (000000000000) must match`);
                                });
                        });
                });
        });
    });
});