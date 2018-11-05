'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const ReviewSchema = mongoose.Schema({
    form: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    formVersion: { type: mongoose.Schema.Types.ObjectId, required: true }, // TODO: not sure if this has been defined correctly
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    responses: [{ type: String }],
    date: { type: Date, required: true }
});

const Review = mongoose.model('Review', ReviewSchema);
module.exports = { Review };