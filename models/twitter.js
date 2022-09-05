const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const Twitter = sequelize.define('twitter', {
  id: {
    type: Sequelize.STRING,
    allowNull: false,
    // primaryKey: true
  },
  screen_name: { 
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  profile_image_url: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

module.exports = Twitter;
