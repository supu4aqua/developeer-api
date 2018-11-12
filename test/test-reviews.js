const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

// set up test configuration
const expect = chai.expect;
chai.use(chaiHttp);

// import models, server, and configuration variables
const { Review } = require('../reviews/models');
const { Form } = require('../forms/models');
const { User } = require('../users/models');
const { createAuthToken } = require('../auth/createAuthToken');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

// dummy variables for testing
const testForm = {
    name: 'Test form 1',
    projectUrl: 'http://www.google.com',
    versions: {
        questions: ['Test question 1', 'Test question 2', 'Test question 3']
    },
    overview: 'Test overview'
}
const userData = {
    username: 'testuser',
    password: 'testpassword'
};

const reviewerUserData = {
    username: 'testreviewer',
    password: 'testpassword'
};

const responses = ['Test response 1', 'Test response 2', 'Test response 3'];
const reviewerName = 'testreviewer';

// seed a user to database
const seedUser = (user) => {
    return User.create(user);
}

// seed a form to database
const seedForm = (form) => {
    return Form.create(form);
}

// clear test database
const tearDownDb = () => {
    return mongoose.connection.dropDatabase();
}

describe('Reviews API', () => {

    before(() => {
        return runServer(TEST_DATABASE_URL);
    });

    after(() => {
        return closeServer();
    });

    afterEach(() => {
        return tearDownDb();
    });

    describe('GET /api/reviews/:id', () => {
        it('Should read review with specified id from database', () => {
            let formId;
            let formVersion;
            let reviewId;
            let token;
            return seedUser(userData)
                .then(user => {
                    token = createAuthToken({ ...userData, id: user._id });
                    return seedForm({ ...testForm, author: user._id });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return Review.create({ formId, formVersion, responses, reviewerName })
                })
                .then(review => {
                    reviewId = review._id;
                    return chai.request(app)
                        .get(`/api/reviews/${String(reviewId)}`)
                        .set('authorization', `Bearer ${token}`)
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res).to.be.json;
                            expect(res.body).to.be.an('object');
                            expect(res.body.review).to.include.keys('_id', 'formId', 'formVersion', 'responses', 'date', 'reviewerName');
                            expect(res.body.review._id).to.equal(String(reviewId));
                            expect(res.body.review.formId).to.equal(String(formId));
                            expect(res.body.review.formVersion).to.equal(String(formVersion));
                            expect(res.body.review.reviewerName).to.equal(reviewerName);
                            expect(res.body.review.responses).to.deep.equal(responses);
                        });
                });
        });

        it('Should reject requests if reviewed form\'s author is not the same as requesting user', () => {
            let formId;
            let formVersion;
            let reviewId;
            let token;
            let author;
            return seedUser(userData)
                .then(user => {
                    token = createAuthToken({ ...userData, id: '000000000000' });
                    author = user._id;
                    return seedForm({ ...testForm, author });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return Review.create({ formId, formVersion, responses, reviewerName })
                })
                .then(review => {
                    reviewId = review._id;
                    return chai.request(app)
                        .get(`/api/reviews/${String(reviewId)}`)
                        .set('authorization', `Bearer ${token}`)
                        .then(res => {
                            expect(res).to.have.status(401);
                            expect(res.body.message).to.equal(`Form author id (${author}) and JWT payload user id (000000000000) must match`);
                        });
                });
        });

        it('Should reject requests if review id not found in database', () => {
            const token = createAuthToken(userData);
            return chai.request(app)
                .get(`/api/reviews/000000000000`)
                .set('authorization', `Bearer ${token}`)
                .then(res => {
                    expect(res).to.have.status(404);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.message).to.equal('Review not found');
                });
        });
    });

    describe('GET /api/reviews/byForm/:formId', () => {
        it('Should read reviews with specified formId from database', () => {
            let formId;
            let formVersion;
            let reviewId;
            let token;
            return seedUser(userData)
                .then(user => {
                    token = createAuthToken({ ...userData, id: user._id });
                    return seedForm({ ...testForm, author: user._id });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return Review.create({ formId, formVersion, responses, reviewerName })
                })
                .then(review => {
                    reviewId = review._id;
                    return chai.request(app)
                        .get(`/api/reviews/byForm/${String(formId)}`)
                        .set('authorization', `Bearer ${token}`)
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res).to.be.json;
                            expect(res.body).to.be.an('object');
                            expect(res.body.reviews[0]).to.include.keys('_id', 'formId', 'formVersion', 'responses', 'date', 'reviewerName');
                            expect(res.body.reviews[0]._id).to.equal(String(reviewId));
                            expect(res.body.reviews[0].formId).to.equal(String(formId));
                            expect(res.body.reviews[0].formVersion).to.equal(String(formVersion));
                            expect(res.body.reviews[0].reviewerName).to.equal(reviewerName);
                            expect(res.body.reviews[0].responses).to.deep.equal(responses);
                        });
                });
        });

        it('Should reject requests if form author is not the same as requesting user', () => {
            let formId;
            let formVersion;
            let token;
            let author;
            return seedUser(userData)
                .then(user => {
                    token = createAuthToken({ ...userData, id: '000000000000' });
                    author = user._id;
                    return seedForm({ ...testForm, author });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return Review.create({ formId, formVersion, responses, reviewerName })
                })
                .then(() => {
                    return chai.request(app)
                        .get(`/api/reviews/byForm/${String(formId)}`)
                        .set('authorization', `Bearer ${token}`)
                        .then(res => {
                            expect(res).to.have.status(401);
                            expect(res.body.message).to.equal(`Unauthorized: Form author id (${author}) and JWT payload user id (000000000000) must match`);
                        });
                });
        });
        it('Should reject requests if form id not found in database', () => {
            const token = createAuthToken(userData);
            return chai.request(app)
                .get(`/api/reviews/byForm/000000000000`)
                .set('authorization', `Bearer ${token}`)
                .then(res => {
                    expect(res).to.have.status(404);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.message).to.equal('Form not found');
                });
        });

    });

    describe('POST /api/reviews', () => {
        it('Should create a new review with reviewerName provided', () => {
            let userId;
            let formId;
            let formVersion;
            return seedUser(userData)
                .then(user => {
                    userId = user._id;
                    return seedForm({ ...testForm, author: userId });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return chai.request(app)
                        .post('/api/reviews')
                        .send({ formId, formVersion, responses, reviewerName })
                })
                .then(res => {
                    expect(res).to.have.status(204);

                    return Review.findOne();
                })
                .then(review => {
                    expect(review.reviewerName).to.equal(reviewerName);
                    expect(review.responses).to.deep.equal(responses);
                    expect(review.formId).to.deep.equal(formId);
                    expect(review.formVersion).to.deep.equal(formVersion);
                    expect(review.reviewerName).to.equal(reviewerName);
                });
        });
        it('Should create a new review with reviewerId provided', () => {

            let reviewerId;
            let userId;
            let formId;
            let formVersion;

            return seedUser(reviewerUserData)
                .then(reviewer => {
                    reviewerId = reviewer._id;
                    return seedUser(userData)
                        .then(user => {
                            userId = user._id;
                            return seedForm({ ...testForm, author: userId });
                        })
                        .then(form => {
                            formId = form._id;
                            formVersion = form.versions[0]._id;
                            return chai.request(app)
                                .post('/api/reviews')
                                .send({ formId, formVersion, responses, reviewerId })
                        })
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res.body.id).to.equal(String(reviewerId));
                            expect(res.body.credit).to.equal(1);

                            return Form.findById(formId)
                        })
                        .then(form => {
                            expect(form.pendingRequests).to.equal(-1);

                            return Review.findOne();
                        })
                        .then(review => {
                            expect(review.responses).to.deep.equal(responses);
                            expect(String(review.formId)).to.equal(String(formId));
                            expect(String(review.formVersion)).to.equal(String(formVersion));
                            expect(String(review.reviewerId)).to.equal(String(reviewerId));
                        });
                });
        });
        it('Should reject requests with missing formId', () => {
            let userId;
            let formVersion;
            return seedUser(userData)
                .then(user => {
                    userId = user._id;
                    return seedForm({ ...testForm, author: userId });
                })
                .then(form => {
                    formVersion = form.versions[0]._id;
                    return chai.request(app)
                        .post('/api/reviews')
                        .send({ formVersion, responses, reviewerName })
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('formId');
                });
        });
        it('Should create reject requests with missing versionId', () => {
            let userId;
            let formId;
            return seedUser(userData)
                .then(user => {
                    userId = user._id;
                    return seedForm({ ...testForm, author: userId });
                })
                .then(form => {
                    formId = form._id;
                    return chai.request(app)
                        .post('/api/reviews')
                        .send({ formId, responses, reviewerName })
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('field missing');
                    expect(res.body.location).to.equal('formVersion');
                });
        });
        it('Should create reject requests with missing reviewerName and reviewerId', () => {
            let userId;
            let formId;
            let formVersion;
            return seedUser(userData)
                .then(user => {
                    userId = user._id;
                    return seedForm({ ...testForm, author: userId });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return chai.request(app)
                        .post('/api/reviews')
                        .send({ formId, formVersion, responses })
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Must provide reviewerId or reviewerName');
                });
        });
        it('Should create reject requests with non-array responses', () => {

            let userId;
            let formId;
            let formVersion;
            return seedUser(userData)
                .then(user => {
                    userId = user._id;
                    return seedForm({ ...testForm, author: userId });
                })
                .then(form => {
                    formId = form._id;
                    formVersion = form.versions[0]._id;
                    return chai.request(app)
                        .post('/api/reviews')
                        .send({ formId, formVersion, responses: 'responses', reviewerName })
                })
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected array of strings');
                });
        });
    });
});