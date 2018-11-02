'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const UserSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    credit: { type: Number }
});

UserSchema.methods.serialize = function () {
    return {
        id: this._id,
        username: this.username,
        credit: this.credit
    }
}

// hash password with bcrypt (10 rounds of salting)
UserSchema.statics.hashPassword = function (password) {
    return bcrypt.hash(password, 10);
};

// check if supplied password matches hashed password in database
UserSchema.methods.validatePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = { User };