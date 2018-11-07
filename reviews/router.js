'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const { Review } = require('./models');

// retrieve a review
router.get('/:id', (req, res) => {

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
        return res.status(201).json({ review });
    });

});

// update a review
// router.put('/:id', (req, res) => {});

// delete a review
// router.delete('/:id', (req, res) => {});

module.exports = router;