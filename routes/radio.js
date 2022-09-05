const path = require('path');

const express = require('express');

const radioController = require('../controllers/radio');

const router = express.Router();

router.get('/', radioController.getIndex);

module.exports = router;
