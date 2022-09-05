
const Twitter = require('../models/twitter');
const twitterAPI = require('../src/twitter');
const path = require("path");
const Radio = require('../models/radio');
const exec = require('child_process').exec;
const { validationResult } = require("express-validator/check");
const {strings} = require('../util/strings');

const SRC_NAME = strings.twitter_src_name;


exports.getUsers = (req, res, next) => {
  let newsSources, index = undefined;
  let errors = req.query.valid;
  
  let rConfig = undefined;
  Radio.findByPk(1)
    .then((radioConfig) => {
      if (radioConfig) {
        rConfig = radioConfig;
        newsSources = JSON.parse(radioConfig.newsSources);

        index = newsSources.findIndex((src) => src.name === SRC_NAME);
        
      }
      return Twitter.findAll();
    })
    .then((users) => {
      if(!errors){
        res.render("twitter", {
          users: users,
          twitterConfig: (index != -1? newsSources[index] : undefined),
          newsFrecuency: rConfig.newsFrecuency,
          tweets: undefined,
          pageTitle: "Radio",
          path: "/twitter",
          hasError: false,
          errorMessage: null,
          validationErrors: [],
          oldInput: {screen_name: ""}
        });
      }else{
        res.status(422).render("twitter", {
          users: users,
          twitterConfig: (index != -1? newsSources[index] : undefined),
          tweets: undefined,
          pageTitle: "Radio",
          path: "/twitter",
          hasError: true,
          newsFrecuency: rConfig.newsFrecuency,
          errorMessage: JSON.parse(errors)[0].msg,
          validationErrors: JSON.parse(errors),
          oldInput: {
            screen_name: JSON.parse(errors)[0].param === "screen_name" ? JSON.parse(errors)[0].value : ""
          }
        });
      }
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.postAddUser = (req, res, next) => {
    const screen_name = req.body.screen_name;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/twitter?valid=' + JSON.stringify(errors.array()));
    }else{
      Twitter.findByPk(screen_name)
      .then((user) => {
        if(!user){
          twitterAPI.userInfoV2(screen_name)
          .then((result) => {
            if(result.data){
  
              const user = new Twitter({
                  screen_name: screen_name,
                  name: result.data[0].name,
                  id: result.data[0].id,
                  profile_image_url: result.data[0].profile_image_url
                });
                
                user
                  .save()
                  .then((result) => {
                    console.log("User Created");
                    res.redirect("/twitter");
                  })
                  .catch((err) => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                  });
  
            } else if(result.errors){
                return res.redirect('/twitter?valid=' + `[{"value":"${screen_name}","msg":"${result.errors.detail}","param":"screen_name","location":"body"}]`);
            }
          })
          .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
        }else{
          return res.redirect('/twitter?valid=' + `[{"value":"${screen_name}","msg":"El usuario ya existe.","param":"screen_name","location":"body"}]`);
        }
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    }

  };

exports.postDeleteUser = (req, res, next) => {
    const screen_name = req.body.screen_name;

    Twitter.findByPk(screen_name)
    .then((user) => {
      if(!user){
        return res.redirect('/twitter?valid=' + `[{"value":"${screen_name}","msg":"User not found"}]`);
      }else{
        user.destroy()
        .then((result) => {
          res.redirect('/twitter');
        })
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
      }
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  };

  exports.postSetConfig = (req, res, next) => {
    const maxTime = req.body.max_time;
    const maxNews = req.body.max_news;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/twitter?valid=' + JSON.stringify(errors.array()));
    }else{
      Radio.findByPk(1)
      .then((radioConfig) => {
        if (radioConfig) {
          
          let newsSources = JSON.parse(radioConfig.newsSources);

          let index = newsSources.findIndex((src) => src.name === SRC_NAME);

          if(index != -1){
            newsSources[index].maxNews = maxNews;
            newsSources[index].maxTime = maxTime;
            radioConfig.newsSources = JSON.stringify(newsSources);
            radioConfig.save();
          }
          res.redirect('/twitter')

          }
        })
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
    }
  };

  exports.postSetNewsFrecuency = (req, res, next) => {
    const newsFrecuency = req.body.news_frecuency;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/twitter?valid=' + JSON.stringify(errors.array()));
    }else{
      Radio.findByPk(1)
      .then((radioConfig) => {
        if (radioConfig) {
          radioConfig.newsFrecuency = newsFrecuency;
          return radioConfig.save();
        }
      })
      .then(() => {
        res.redirect('/twitter')
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    }
  };

  exports.getTweets = (req, res, next) => {
    
    Twitter.findAll()
    .then((users) => {
      if(users){
        Radio.findByPk(1)
        .then((radioConfig) => {
        let newsSources = JSON.parse(radioConfig.newsSources);

        let index = newsSources.findIndex((src) => src.name === SRC_NAME);

          if(index != -1){
            let tweets = [];
            for(let user of users){
              twitterAPI.getTweetsID(user.id, (new Date (Date.now()-(newsSources[index].maxTime * 60 * 60 * 1000))).toISOString(), newsSources[index].maxNews)
              .then((result) => {
                  tweets.push({name: user.name, tweets: result.data});
                  console.log(tweets);
              })
              .then((reult) => {
                if(users.length === tweets.length){
                  res.render("twitter", {
                    users: users,
                    newsFrecuency: radioConfig.newsFrecuency,
                    twitterConfig: (index != -1 ? newsSources[index] : undefined),
                    pageTitle: "Radio",
                    path: "/twitter",
                    tweets: JSON.stringify(tweets),
                    hasError: false,
                    errorMessage: null,
                    validationErrors: [],
                    oldInput: {
                      screen_name: ""
                    }
                  });
                }
              })
              .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
              });
            }
          }else{
            res.redirect("/twitter");
          }
        })
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
      }else{
        res.redirect("/twitter");
      }
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  }