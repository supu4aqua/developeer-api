'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorhandler = require('errorhandler');
const passport = require('passport');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
// use `useCreateIndex()` instead of deprecated `ensureIndex()`
mongoose.set('useCreateIndex', true);

// Configuration and Environment variables
const { CLIENT_ORIGIN, PORT, DATABASE_URL } = require('./config');

// Initiate app
const app = express();

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));
app.use(errorhandler());

// passport strategies
const { localStrategy, jwtStrategy } = require('./auth/strategies');
passport.use(localStrategy);
passport.use(jwtStrategy);

// Routers
const usersRouter = require('./users/router');
const authRouter = require('./auth/router');
const formsRouter = require('./forms/router');
const reviewsRouter = require('./reviews/router');
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/forms', formsRouter);
app.use('/api/reviews', reviewsRouter);

// declare `server` here, assign a value in runServer, and access it in closeServer
let server;

// Starts server and returns a Promise
function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, { useNewUrlParser: true }, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                console.log(`Your app is listening on port ${port}`);
                resolve();
            })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

// Closes server and returns a Promise
function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

// call runServer if server.js is called directly (i.e. not from test code)
if (require.main === module) {
    runServer(DATABASE_URL).catch(err => console.error(err));
};


// exports for use in test code
module.exports = { app, runServer, closeServer };