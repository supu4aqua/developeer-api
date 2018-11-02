'use strict';

const express = require('express');
const router = express.Router();

const passport = require('passport');
const jwt = require('jsonwebtoken');

const config = require('../config');

const createAuthToken = function (user) {
    return jwt.sign({ user }, config.JWT_SECRET, {
        subject: user.username,
        expiresIn: config.JWT_EXPIRY,
        algorithm: 'HS256'
    });
};

const localAuth = passport.authenticate('local', { session: false });

// The user provides a username and password to login
router.post('/loginlocal', localAuth, (req, res) => {
    const authToken = createAuthToken(req.user.serialize());
    res.status(200).json({ authToken });
});

const jwtAuth = passport.authenticate('jwt', { session: false });

// The user provides a valid JWT to login (and receive a new JWT)
router.post('/loginjwt', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    res.status(200).json({ authToken });
});

module.exports = router;
