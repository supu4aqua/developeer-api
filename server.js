const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorhandler = require('errorhandler');

// Configuration and Environment variables
const { CLIENT_ORIGIN } = require('./config');
const PORT = process.env.PORT || 3000;

// Initiate app
const app = express();

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(morgan('dev'));
app.use(errorhandler());


app.get('/api/*', (req, res) => {
    res.json({ ok: true })
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

module.exports = { app };