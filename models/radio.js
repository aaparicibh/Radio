const Sequelize = require("sequelize");

const sequelize = require("../util/database");
const {strings} = require("../util/strings")

const Radio = sequelize.define("radio", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  newsSources: {
    type: Sequelize.STRING(5000),
    allowNull: false,
    defaultValue: `[{"name": ${strings.twitter_src_name},"maxNews": 10,"maxTime": 24,"active": true}]`,
  },
  musicSources: {
    type: Sequelize.STRING(5000),
    allowNull: false,
    defaultValue: "[]",
  },
  activeMusicSource: {
    type: Sequelize.STRING(),
    allowNull: false,
    defaultValue: strings.spotify_src_name
  },
  newsFrecuency: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 15,
  },
  lastDate: {
    type: Sequelize.DATE,
    allowNull: true
  }
});

module.exports = Radio;
