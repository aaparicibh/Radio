const Twitter = require('../models/twitter');
const Radio = require('../models/radio');

exports.getIndex = (req, res, next) => {
  Twitter.findAll()
    .then(users => {
      res.render('index', {
        users: users,
        pageTitle: 'Radio',
        path: '/'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
