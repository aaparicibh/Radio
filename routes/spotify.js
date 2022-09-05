const { check } = require("express-validator");

const express = require('express');

const spotifyController = require('../controllers/spotify');

const router = express.Router();


router.get('/', spotifyController.getData);
router.get('/login', spotifyController.getLogin);
router.get('/logout', spotifyController.getLogout);
router.get('/callback', spotifyController.getCallback);
router.post('/playerSetDev',
[
  check("device", "Device Name has to be valid")
    .isAlphanumeric()
    .trim()
], spotifyController.playerSetDev);

router.get('/playerPlay', spotifyController.playerPlay);
router.get('/playerPause', spotifyController.playerPause);
router.get('/playerNext', spotifyController.playerNext);
router.get('/playerPrevious', spotifyController.playerPrevious);

router.post(
  "/clientLogin",
  [
    check("password", "Password has to be valid")
      .trim(),
    check("user", "User has to be valid")
      .trim(),
  ],
  spotifyController.postClientLogin
);

router.post('/setPlaylist',
[
  check("playlist", "Playlist has to be valid")
    .trim()
    .matches(/^https:\/\/open.spotify.com\/playlist\/[A-Za-z0-9]*\?[A-Za-z0-9=-]*$/),
], spotifyController.postSetPlaylist);

router.post('/setActiveSrc',
[
  check("source", "Source Name has to be valid")
    .isAlphanumeric()
    .trim()
], spotifyController.postSetActiveSrc);

module.exports = router;
