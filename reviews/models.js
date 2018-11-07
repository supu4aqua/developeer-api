'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const ReviewSchema = mongoose.Schema({
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    formVersion: { type: mongoose.Schema.Types.ObjectId, required: true },
    responses: [{ type: String }],
    // reviewerId is used if reviewer is a Developeer user
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // reviewerName is used if reviewer is NOT a Developeer user
    reviewerName: { type: String },
    date: { type: Date, default: new Date() }
});

const Review = mongoose.model('Review', ReviewSchema);
module.exports = { Review };