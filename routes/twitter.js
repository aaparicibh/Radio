const express = require('express');
const { check } = require("express-validator");

const twitterController = require('../controllers/twitter');

const router = express.Router();

router.get('/', twitterController.getUsers);

router.get('/getTweets', twitterController.getTweets);

router.post('/addUser',
[
  check("screen_name", "Screen Name has to be valid")
    .trim()
    .isLength({ min: 1, max: 15})
    .matches(/^[A-Za-z0-9_]*$/),
], twitterController.postAddUser);

router.post('/deleteUser', twitterController.postDeleteUser);

router.post('/setConfig',
[
  check("max_time", "Max time has to be valid")
    .isInt({min:1, max:24}),
  check("max_news", "Max news has to be valid")
    .isInt({min:5, max:10}),
], twitterController.postSetConfig);

router.post('/setNewsFrecuency',
[
  check("news_frecuency", "News Frecuency has to be valid")
    .isInt({min:15, max:90}),
], twitterController.postSetNewsFrecuency);



module.exports = router;
