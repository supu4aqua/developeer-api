'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const { Form } = require('./models');
const { User } = require('../users/models');

const jwtAuth = passport.authenticate('jwt', { session: false });


// retrieve random form 
router.get('/toreview', (req, res) => {
    // if userId is provided, use as negative filter to avoid reviewing own forms
    const userId = req.query.userId ? ObjectId(req.query.userId) : null;
    Form.aggregate([
        // filter by forms with pending requests
        { $match: { pendingRequests: { $gt: 0 } } },
        // then by forms NOT authored by the requesting user
        { $match: { author: { $ne: userId } } },
        // and return a single random form
        { $sample: { size: 1 } }])
        .then(form => {
            if (form.length === 0) {
                return res.status(404).json({ message: 'No forms found' });
            }
            return res.status(200).json({ form: form[0] });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });

});

// retrieve a form by id
router.get('/:id', (req, res) => {
    Form.findOne({ _id: req.params.id })
        .then(form => {
            // check if form was found in database
            if (form === null) {
                console.error('Form not found');
                return res.status(404).json({ message: 'Form not found' });
            }
            // THIS CHECK REMOVED WHILE ENDPOINT IS NOT PROTECTED, MAY REPLACE IN FUTURE
            // check if req.user.id is the same as the form author id
            // if (String(form.author) !== req.user.id) {
            //     const message = `Form author id (${String(form.author)}) and JWT payload user id (${req.user.id}) must match`;
            //     return res.status(401).json({ message });
            // }
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

    let form;
    // create new form
    return Form.create({
        author: ObjectId(req.user.id),
        name: req.body.name,
        projectUrl: req.body.projectUrl,
        // shareableUrl: '', // TODO: generate shareable urls
        versions: {
            questions: [...req.body.questions]
        }
    }).then(_form => {
        form = _form;
        // add form id to user's forms
        User.findByIdAndUpdate(
            req.user.id,
            { $push: { forms: form._id } }
        ).then(() => {
            return res.status(201).json({ form });
        }).catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        });
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
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
router.delete('/:id', jwtAuth, (req, res) => {
    const requiredFields = ['id'];
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
        const message = `Request path id (${req.params.id}) and request body id (${req.body.id}) must match`;
        console.error(message);
        return res.status(401).json({ message });
    }

    return Form.findByIdAndDelete(req.params.id)
        .then(form => {
            // remove form from user's forms
            return User.findByIdAndUpdate(
                req.user.id,
                { $pull: { forms: String(form._id) } },
                { new: true }
            ).then(user => {
                return res.status(200).json(user.serialize());
            }).catch(err => {
                console.log(err);
                return res.status(500).json({ message: 'internal server error' });
            });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ message: 'internal server error' });
        });

});

module.exports = router;