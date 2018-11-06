'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const { Form } = require('./models');

const jwtAuth = passport.authenticate('jwt', { session: false });

// retrieve a form by id
router.get('/:id', jwtAuth, (req, res) => {
    Form.findOne({ _id: req.params.id })
        .then(form => {
            // check if form was found in database
            if (form === null) {
                console.error('Form not found');
                return res.status(404).json({ message: 'Form not found' });
            }

            // check if req.user.id is the same as the form author id
            if (String(form.author) !== req.user.id) {
                const message = `Form author id (${String(form.author)}) and JWT payload user id (${req.user.id}) must match`;
                return res.status(401).json({ message });
            }
            return res.status(200).json({ form })
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        });
});

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
router.put('/:id', jwtAuth, (req, res) => {
    // check for required fields
    // note: `id`, `author`, `created`, and `shareableUrl` cannot be updated
    const requiredFields = ['id', 'name', 'projectUrl', 'pendingRequests', 'questions'];
    const missingField = requiredFields.find(field => !(field in req.body));

    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'field missing',
            location: missingField
        });
    }

    // check if params.id is the same as the body.id
    if (req.params.id !== req.body.id) {
        const message = `Request path id (${req.params.id}) and request body id (${req.body.id})`;
        console.error(message);
        return res.status(400).json({ message });
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

    // check that `pendingRequests` is a number
    if (typeof req.body.pendingRequests !== 'number') {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected number',
            location: 'pendingRequests'
        });
    }

    Form.findOne({ _id: req.body.id })
        .then(form => {
            // check if req.user.id is the same as the form author id
            if (String(form.author) !== req.user.id) {
                const message = `Form author id (${form.author}) and JWT payload user id (${req.user.id}) must match`;
                return res.status(401).json({ message });
            }
            // update fields
            form.name = req.body.name;
            form.projectUrl = req.body.projectUrl;
            form.pendingRequests = req.body.pendingRequests;
            form.versions.push({ questions: req.body.questions, date: new Date() })
            form.save();
            return res.status(200).json({ form })
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        });

});

// delete a form
router.delete('/:id', (req, res) => {

});

module.exports = router;