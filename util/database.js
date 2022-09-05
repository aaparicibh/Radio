const Sequelize = require('sequelize');

const sequelize = new Sequelize('radio', 'root', '1234', {//database_name, user, password
  dialect: 'mariadb',
  host: 'localhost'
});

module.exports = sequelize;