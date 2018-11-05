'use strict';

const express = require('express');
const router = express.Router();

const { Reviews } = require('./models');

// retrieve a review
router.get('/:id', (req, res) => {

});

// create a new review
router.post('/', (req, res) => {

});

// update a review
// router.put('/:id', (req, res) => {});

// delete a review
// router.delete('/:id', (req, res) => {});

module.exports = router;