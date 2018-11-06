'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const { Form } = require('./models');

// retrieve a form
router.get('/:id', (req, res) => {

});

const jwtAuth = passport.authenticate('jwt', { session: false });

// create a new form
router.post('/', jwtAuth, (req, res) => {

    // check for required fields 
    const requiredFields = ['name', 'projectUrl', 'questions'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'field missing',
            location: missingField
        });
    }

    // check that string fields are strings
    const stringFields = ['name', 'projectUrl'];
    const nonStringField = stringFields.find(field => {
        return (field in req.body && typeof req.body[field] !== 'string');
    });

    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    // check that `questions` is an array of strings
    const isArray = req.body.questions instanceof Array;
    let isStrings = true;
    if (isArray) {
        for (let q of req.body.questions) {
            if (typeof q != 'string') {
                isStrings = false;
            }
        }
    }
    if (!isArray || !isStrings) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected array of strings',
            location: 'questions'
        });
    }

    // create new form
    return Form.create({
        author: ObjectId(req.user.id),
        name: req.body.name,
        projectUrl: req.body.projectUrl,
        // shareableUrl: '', // TODO: generate shareable urls
        versions: {
            questions: [...req.body.questions]
        }
    }).then(form => {
        return res.status(201).json({ form });
    });
});

// update a form
router.put('/:id', (req, res) => {

});

// delete a form
router.delete('/:id', (req, res) => {

});

module.exports = router;