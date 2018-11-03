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
                    expect(res.body.message).to.equal('cannot start or end with whitespace');
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
                    expect(res.body.message).to.equal('cannot start or end with whitespace');
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
                    expect(res.body.message).to.equal('already in use');
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
                        'credit'
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

    describe('PUT /api/users/:id', () => {
        it('Should reject unauthorized PUT requests', () => {
            return chai
                .request(app)
                .put(`/api/users/1`)
                .then(res => {
                    expect(res).to.have.status(401);
                });
        });
        it('Should reject requests with missing credit', () => {
            const userData = {
                username: 'testuserA'
            };
            const newUserData = {
                username: 'testuserB',
            };

            let token;

            return User.hashPassword('testpassword')
                .then(password => {
                    userData.password = password;
                    return User.create(userData);
                })
                .then(user => {
                    token = createAuthToken(user.serialize());
                    newUserData.id = user._id;

                    return chai
                        .request(app)
                        .put(`/api/users/${newUserData.id}`)
                        .set('authorization', `Bearer ${token}`)
                        .send(newUserData);
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('credit');
                });
        });
        it.only('Should reject requests with mismatched param id and request body id', () => {
            const userData = {
                username: 'testuserA',
                credit: 5
            };

            let token;

            return User.hashPassword('testpassword')
                .then(password => {
                    userData.password = password;
                    return User.create(userData);
                })
                .then(user => {
                    token = createAuthToken(user.serialize());
                    userData.id = user._id;

                    return chai
                        .request(app)
                        .put(`/api/users/1234abcd`)
                        .set('authorization', `Bearer ${token}`)
                        .send(userData);
                })
                .then(res => {
                    expect(res).to.have.status(400);
                    console.log(res.body.message);
                    console.log(`Request path id (1234abcd), request body id (${userData.id}), and JWT payload user id (${userData.id}) must match`);
                    expect(res.body.message).to.equal(`Request path id (1234abcd), request body id (${userData.id}), and JWT payload user id (${userData.id}) must match`);
                });
        });
        it('Should update user data (excluding username)', () => {
            const userData = {
                username: 'testuserA'
            };
            const newUserData = {
                username: 'testuserA',
                credit: 20
            };

            let token;

            return User.hashPassword('testpassword')
                .then(password => {
                    userData.password = password;
                    return User.create(userData);
                })
                .then(user => {
                    token = createAuthToken(user.serialize());
                    newUserData.id = user._id;
                    return chai
                        .request(app)
                        .put(`/api/users/${newUserData.id}`)
                        .set('authorization', `Bearer ${token}`)
                        .send(newUserData);
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.keys('authToken');

                    return User.findOne({ _id: newUserData.id })
                        .then(user => {
                            expect(user.credit).to.equal(20);
                        });
                });
        });


        // FUTURE IMPLEMENTATION: TEST ONLY IF ALLOWING USERNAME CHANGES
        // it('Should reject requests with missing username', () => {
        //     const userData = {
        //         username: 'testuserA'
        //     };
        //     const newUserData = {
        //         credit: 4,
        //     };

        //     let token;

        //     return User.hashPassword('testpassword')
        //         .then(password => {
        //             userData.password = password;
        //             return User.create(userData);
        //         })
        //         .then(user => {
        //             token = createAuthToken(user.serialize());
        //             newUserData.id = user._id;

        //             return chai
        //                 .request(app)
        //                 .put(`/api/users/${newUserData.id}`)
        //                 .set('authorization', `Bearer ${token}`)
        //                 .send(newUserData);
        //         })
        //         .then(res => {
        //             expect(res).to.have.status(422);
        //             expect(res.body.reason).to.equal('ValidationError');
        //             expect(res.body.message).to.equal('field missing');
        //             expect(res.body.location).to.equal('username');
        //         });
        // });

    });
});