'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const { Review } = require('./models');
const { User } = require('../users/models');
const { Form } = require('../forms/models');

const jwtAuth = passport.authenticate('jwt', { session: false });

// retrieve a review
router.get('/:id', jwtAuth, (req, res) => {
    let review;
    return Review.findById(req.params.id)
        .then(_review => {
            review = _review;
            // check if review was found in database
            if (review === null) {
                console.error('Review not found');
                return res.status(404).json({ message: 'Review not found' });
            }
            console.log(review)
            return Form.findById(review.formId)
                .then(form => {
                    // check if req.user.id is the same as the form author id
                    if (String(form.author) !== req.user.id) {
                        const message = `Form author id (${form.author}) and JWT payload user id (${req.user.id}) must match`;
                        return res.status(401).json({ message });
                    }
                    return res.status(200).json({ review })
                })

                .catch(err => {
                    console.error(err);
                    res.status(500).json({
                        code: 500,
                        message: 'Internal server error'
                    });
                });

        })
});

// retrieve all reviews for a form
router.get('/byForm/:formId', jwtAuth, (req, res) => {
    return Form.findById(req.params.formId)
        .then(form => {
            if (form === null) {
                return Promise.reject('Form not found');
            }

            // check if req.user.id is the same as the form author id
            if (String(form.author) !== req.user.id) {
                return Promise.reject(`Unauthorized: Form author id (${form.author}) and JWT payload user id (${req.user.id}) must match`);
            }

            return Review.find({ formId: req.params.formId })
        })
        .then(reviews => {
            console.log('reviews');
            res.status(200).json({ reviews })
        })
        .catch(err => {
            console.error(err);
            if (err.startsWith('Unauthorized')) {
                res.status(401).json({ message: err });
            } else if (err = 'Form not found') {
                res.status(404).json({ message: err })
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        });
});

// create a new review
router.post('/', (req, res) => {
    const requiredFields = ['formId', 'formVersion', 'responses'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'field missing',
            location: missingField
        });
    }

    // check that `responses` is an array of strings
    const isArray = req.body.responses instanceof Array;
    let isStrings = true;
    if (isArray) {
        for (let r of req.body.responses) {
            if (typeof r != 'string') {
                isStrings = false;
            }
        }
    }
    if (!isArray || !isStrings) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected array of strings',
            location: 'responses'
        });
    }

    // check if request provides reviewId (Developeer user id) or reviewerName
    let reviewer;
    if (req.body.reviewerId) {
        reviewer = { reviewerId: req.body.reviewerId };
    } else if (req.body.reviewerName) {
        reviewer = { reviewerName: req.body.reviewerName };
    }

    if (typeof reviewer === 'undefined') {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Must provide reviewerId or reviewerName',
        });
    }

    // create new review
    return Review.create({
        formId: ObjectId(req.body.formId),
        formVersion: ObjectId(req.body.formVersion),
        responses: [...req.body.responses],
        ...reviewer
    }).then(review => {
        // if reviewer was a Devlopeer user, reduce pending requests on form,
        // then add 1 credit to their account and add review id to reviewsGiven, return user
        if (review.reviewerId) {
            const reviewId = review._id
            Form.findByIdAndUpdate(
                review.formId,
                { $inc: { pendingRequests: -1 } }
            ).then(() => {
                console.log(typeof reviewId)
                return User.findByIdAndUpdate(
                    review.reviewerId,
                    { $inc: { credit: 1 }, $push: { reviewsGiven: reviewId } },
                    { new: true }
                )
            }).then(user => res.status(200).json(user.serialize()))
        } else {
            // if not a developeer user, send success w/o content
            res.status(204).end()
        }
    });

});

// update a review
// router.put('/:id', (req, res) => {});

// delete a review
// router.delete('/:id', (req, res) => {});

module.exports = router;