const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// set up test configuration
const expect = chai.expect;
chai.use(chaiHttp);

// import models, server, and configuration variables
const { User } = require('../users/models');
const { createAuthToken } = require('../auth/createAuthToken');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY } = require('../config');

// clear test database
const tearDownDb = () => {
    return mongoose.connection.dropDatabase();
}

describe('Users API', () => {

    const username = 'exampleUser';
    const password = 'examplePassword';

    before(() => {
        return runServer(TEST_DATABASE_URL);
    });

    after(() => {
        return closeServer();
    });

    afterEach(() => {
        return tearDownDb();
    });

    describe('GET /api/users/:id', () => {
        it('Should reject requests if user id not found in database', () => {
            return chai.request(app)
                .get(`/api/users/000000000000`)
                .then(res => {
                    expect(res).to.have.status(404);
                    expect(res.body.message).to.equal('User not found');
                });
        });
        it('Should read user with specified id from database', () => {
            return User.create({ username, password })
                .then(user => {
                    return chai.request(app)
                        .get(`/api/users/${user._id}`)
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res.body.username).to.equal(username)
                        });
                });
        });
    });

    describe('POST /api/users', () => {
        it('Should reject requests with a missing username', () => {
            return chai.request(app)
                .post('/api/users')
                .send({ password })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should reject requests with missing password', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('password');
                });
        });
        it('Should reject requests with non-string username', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username: 1234, password })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should reject requests with non-trimmed username', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username: ` ${username} `, password })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Cannot start or end with whitespace');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should reject requests with non-trimmed password', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username, password: ` ${password} ` })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Cannot start or end with whitespace');
                    expect(res.body.location).to.equal('password');
                });
        });
        it('Should reject requests with empty username', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username: '', password })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('must be at least 1 characters long');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should reject requests with a username greater than 20 characters', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username: 'abcdefghijklmnopqrstuvwxyz', password })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('must be at most 20 characters long');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should reject requests with password less than ten characters', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username, password: '123456789' })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('must be at least 10 characters long');
                    expect(res.body.location).to.equal('password');
                });
        });
        it('Should reject requests with password greater than 72 characters', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username, password: '1'.repeat(73) })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('must be at most 72 characters long');
                    expect(res.body.location).to.equal('password');
                });
        });
        it('Should reject requests with username already in database', () => {
            return User.create({ username, password })
                .then(() => {
                    return chai.request(app)
                        .post('/api/users')
                        .send({ username, password });
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Already in use');
                    expect(res.body.location).to.equal('username');
                });
        });
        it('Should create a new user', () => {
            return chai
                .request(app)
                .post('/api/users')
                .send({ username, password })
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.keys(
                        'id',
                        'username',
                        'credit',
                        'forms'
                    );
                    expect(res.body.username).to.equal(username);
                    expect(res.body.credit).to.equal(0);
                    return User.findOne({ username });
                })
                .then(user => {
                    expect(user).to.not.be.null;
                    expect(user.username).to.equal(username);
                    expect(user.credit).to.equal(0);
                    return user.validatePassword(password);
                })
                .then(passwordIsCorrect => {
                    expect(passwordIsCorrect).to.be.true;
                });
        });
    });
});