const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// set up test configuration
const expect = chai.expect;
chai.use(chaiHttp);

// import models, server, and configuration variables
const { Form } = require('../forms/models');
const { User } = require('../users/models');
const { createAuthToken } = require('../auth/createAuthToken');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY } = require('../config');

// clear test database
const tearDownDb = () => {
    return mongoose.connection.dropDatabase();
}

// create a dummy user to allow creation of a JWT for testing protected endpoints
// TODO: check if this is actually necessary
const seedUser = (userData) => {
    return User.create(userData);
}

describe('Forms API', () => {
    const name = 'Test form 1';
    const projectUrl = 'http://www.google.com';
    const questions = ['Test question 1', 'Test question 2', 'Test question 3'];

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

    beforeEach(() => {
        return seedUser();
    });

    afterEach(() => {
        return tearDownDb();
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
});