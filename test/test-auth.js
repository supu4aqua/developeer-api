'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

// set up test configuration
const expect = chai.expect;
chai.use(chaiHttp);

// import models, server, and configuration variables
const { User } = require('../users/models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL, JWT_SECRET, JWT_EXPIRY } = require('../config');

describe('Auth API', () => {
    const username = 'exampleUser';
    const password = 'examplePassword';
    const credit = 0;
    const forms = [];
    let id = '';

    before(() => {
        return runServer(TEST_DATABASE_URL);
    });

    after(() => {
        return closeServer();
    });

    beforeEach(function () {
        return User.hashPassword(password).then(password => {
            return User.create({
                username,
                password
            });
        }).then(user => id = user.id);
    });

    afterEach(function () {
        return User.deleteMany({});
    });

    describe('POST /api/auth/loginlocal', function () {
        it('Should reject requests with no credentials', () => {
            return chai
                .request(app)
                .post('/api/auth/loginlocal')
                .then((res) => {
                    expect(res).to.have.status(400);
                });
        });

        it('Should reject requests with incorrect username', () => {
            return chai
                .request(app)
                .post('/api/auth/loginlocal')
                .send({ username: 'wronguser', password })
                .then((res) => {
                    expect(res).to.have.status(401);
                });
        });
        it('Should reject requests with incorrect password', () => {
            return chai
                .request(app)
                .post('/api/auth/loginlocal')
                .send({ username, password: 'wrongpassword' })
                .then((res) => {
                    expect(res).to.have.status(401);
                });
        });
        it('Should return a valid JWT', () => {
            return chai
                .request(app)
                .post('/api/auth/loginlocal')
                .send({ username, password })
                .then((res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    const token = res.body.authToken;
                    expect(token).to.be.a('string');
                    const payload = jwt.verify(token, JWT_SECRET, {
                        algorithm: ['HS256']
                    });
                    expect(payload.user).to.deep.equal({
                        id,
                        username,
                        credit,
                        forms
                    });
                });
        });
    });

    describe('POST /api/auth/loginjwt', () => {
        it('Should reject requests with no credentials', () => {
            return chai
                .request(app)
                .post('/api/auth/loginjwt')
                .then((res) => {
                    expect(res).to.have.status(401);
                });
        });

        it('Should reject request with tokens signed by invalid secret', () => {
            const token = jwt.sign(
                { user: { username } },
                'wrongsecret',
                {
                    algorithm: 'HS256',
                    expiresIn: JWT_EXPIRY
                }
            );

            return chai
                .request(app)
                .post('/api/auth/loginjwt')
                .set('Authorization', `Bearer ${token}`)
                .then((res) => {
                    expect(res).to.have.status(401);
                });
        });

        it('Should reject requests with an expired token', () => {
            const token = jwt.sign(
                { user: { username } },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    expiresIn: '-1'
                }
            );

            return chai
                .request(app)
                .post('/api/auth/loginjwt')
                .set('Authorization', `Bearer ${token}`)
                .then((res) => {
                    expect(res).to.have.status(401);
                });
        });

        it('Should return a valid auth token with a newer expiry date', () => {
            const token = jwt.sign(
                { user: { username } },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    subject: username,
                    expiresIn: JWT_EXPIRY
                }
            );
            const decoded = jwt.decode(token);

            return chai
                .request(app)
                .post('/api/auth/loginjwt')
                .set('authorization', `Bearer ${token}`)
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('object');
                    const token = res.body.authToken;
                    expect(token).to.be.a('string');
                    const payload = jwt.verify(token, JWT_SECRET, {
                        algorithm: ['HS256']
                    });
                    expect(payload.user).to.deep.equal({ username });
                    expect(payload.exp).to.be.at.least(decoded.exp);
                });
        });
    });
});