const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require("csurf");

const flash = require("connect-flash");


const errorController = require('./controllers/error');
const sequelize = require('./util/database');
const Twitter = require('./models/twitter');
const Radio = require('./models/radio');


const app = express();

const buttons = require('./radio/buttons')

app.set('view engine', 'ejs');
app.set('views', 'views');

const radioRoutes = require('./routes/radio');
const twitterRoutes = require('./routes/twitter');
const spotifyRoutes = require('./routes/spotify');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
    
    const csrfProtection = csrf({ cookie: true });
    app.use(csrfProtection);
    app.use(flash());
    
    app.use((req, res, next) => {
      res.locals.csrfToken = req.csrfToken();
      next();
    });
    
    app.use(radioRoutes);
    app.use('/twitter', twitterRoutes);
    app.use('/spotify', spotifyRoutes);
    
    app.get('500', errorController.get500);

    app.use(errorController.get404);
    
    app.use((error, req, res, next) => {
      res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
      });
    });

const musicPlayer = require('./radio/musicPlayer');

sequelize
  // .sync({ force: true })
  .sync()
  .then(result => {
    return Radio.findByPk(1);
  })
  .then(radio => {
    if (!radio) {
      return Radio.create();
    }else{
      musicPlayer.start();
    }
    return radio;
  })
  .then(() => {
    app.listen(3000);
    console.log('PORT: 3000');
  })
  .catch(err => {
    console.log(err);
  });
