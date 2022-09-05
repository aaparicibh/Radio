const request = require('request'); // "Request" library
const { validationResult } = require("express-validator/check");
const querystring = require('querystring');
const credentials = require('../src/credentials');

const spotify = require('../src/spotify');
const Radio = require('../models/radio');
const musicPlayer = require('../radio/musicPlayer');

const exec = require('child_process').exec;
const {strings} = require('../util/strings');

const SRC_NAME = strings.spotify_src_name;
const CLIENT_INI_NAME = "Radio";


 exports.getData = (req, res, next) => {
  let errors = req.query.valid;

   Radio.findByPk(1)
   .then((radioConfig) => {
     
     if (radioConfig) {
       let musicSources = JSON.parse(radioConfig.musicSources);
       
       let index = musicSources.findIndex((src) => src.name === SRC_NAME);
        if(!errors){
          res.render("spotify", {
            pageTitle: "Radio",
            logged: index != -1? true: false,
            errorMessage: "",
            activeSrc: radioConfig.activeMusicSource,
            spotifyConfig: musicSources[index]? musicSources[index] : undefined,
            path: "/spotify",
          });
        }else{
          res.status(422).render("spotify", {
            pageTitle: "Radio",
            logged: index != -1? true: false,
            errorMessage: JSON.parse(errors)[0].msg,
            validationErrors: JSON.parse(errors),
            activeSrc: radioConfig.activeMusicSource,
            spotifyConfig: musicSources[index]? musicSources[index] : undefined,
            path: "/spotify",
          });
        }
     }
   })
   .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
   });
 };
 
 const client_id = credentials.spotify.clientId; // Your client id
 const client_secret = credentials.spotify.clientSecret; // Your secret
 const redirect_uri = credentials.spotify.redirectUri; // Your redirect uri
 
 /**
  * Generates a random string containing numbers and letters
  * @param  {number} length The length of the string
  * @return {string} The generated string
  */
 var generateRandomString = function(length) {
   var text = '';
   var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
   for (var i = 0; i < length; i++) {
     text += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return text;
 };
 
 var stateKey = 'spotify_auth_state';
 
exports.getLogin = (req, res, next) => {
 
   var state = generateRandomString(16);
   res.cookie(stateKey, state);
 
   // the application requests authorization
   var scope = 'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-read-playback-state';
   res.redirect('https://accounts.spotify.com/authorize?' +
     querystring.stringify({
       response_type: 'code',
       client_id: client_id,
       scope: scope,
       redirect_uri: redirect_uri,
       state: state
     }));
 };

exports.getLogout = (req, res, next) => {
 
  exec(`sudo sed -i 's/.*LIBRESPOT_USERNAME.*=.*/LIBRESPOT_USERNAME = /g' /etc/raspotify/conf; sudo sed -i 's/.*LIBRESPOT_PASSWORD.*=.*/LIBRESPOT_PASSWORD = /g' /etc/raspotify/conf && sudo systemctl restart raspotify`, (err, stdout)=>{
    if(err){
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
    else{
      Radio.findByPk(1)
      .then((radioConfig) => {
        if(radioConfig){
          let musicSources = JSON.parse(radioConfig.musicSources);
          for (let i in musicSources){
            if(musicSources[i].name == SRC_NAME){
              musicSources.splice(i);
              radioConfig.musicSources = JSON.stringify(musicSources);
              radioConfig.save();
              break;
            }
          }
        }
        res.redirect('/spotify');
      });
    }
  });
};
 
exports.getCallback = (req, res, next) => {
 
   // the application requests refresh and access tokens
   // after checking the state parameter
   console.log(' cookies', req.cookies);
   
   let code = req.query.code || null;
   let state = req.query.state || null;
   let storedState = req.cookies ? req.cookies[stateKey] : null;
 
   if (state === null || state !== storedState) {
      return res.redirect('/spotify?valid=' + `[{"value":"","msg":"state_mismatch","param":"","location":""}]`);
   } else {
     res.clearCookie(stateKey);
     let authOptions = {
       url: 'https://accounts.spotify.com/api/token',
       form: {
         code: code,
         redirect_uri: redirect_uri,
         grant_type: 'authorization_code'
       },
       headers: {
         'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
       },
       json: true
     };
 
     request.post(authOptions, function(error, response, body) {
       if (!error && response.statusCode === 200) {
 
         let access_token = body.access_token,
             refresh_token = body.refresh_token;
 
         let options = {
           url: 'https://api.spotify.com/v1/me',
           headers: { 'Authorization': 'Bearer ' + access_token },
           json: true
         };
 
         // use the access token to access the Spotify Web API
         request.get(options, function(error, response, body) {
           console.log(body);

           if(body.product !== 'premium'){
            return res.redirect('/spotify?valid=' + `[{"value":"","msg":"It must be a premium account. Please, sign out of Spotify and try again using a premium account","param":"","location":""}]`);
           }

           res.render('login', {
            logged: true,
            errorMessage:'',
            pageTitle: 'Radio',
            access_token: access_token,
            refresh_token: refresh_token,
            userData: body,
            path: '/spotify/callback'
          });
         });
       } else {
          return res.redirect('/spotify?valid=' + `[{"value":"","msg":"invalid_token","param":"","location":""}]`);
       }
     });
   }
};

 exports.playerSetDev = (req, res, next) => {

    const devName = req.body.device;
    
    if(devName){

      Radio.findByPk(1)
      .then((radioConfig) => {
        
        if (radioConfig) {
          let musicSources = JSON.parse(radioConfig.musicSources);

          for (let i in musicSources) {
            if (musicSources[i].name == SRC_NAME) {
              console.log('--', musicSources[i].device.name);
              
              musicSources[i].device.name = devName;

              exec(`sudo sed -i 's/.*LIBRESPOT_NAME.*=.*/LIBRESPOT_NAME = "${devName}"/g' /etc/raspotify/conf && sudo systemctl restart raspotify ; sleep 2s`, (err, stdout)=>{
                if(err){
                  const error = new Error(err);
                  error.httpStatusCode = 500;
                  return next(error);
                }
                else{
                  spotify.avaDevices()
                  .then((data) => {
                    let availableDevices = data.body.devices;

                    let devIndex = availableDevices.findIndex((device) => device.name === devName);

                    if(devIndex >=0 ){
                
                      let id = availableDevices[devIndex].id;
                      spotify.transDevice([id])
                      .then(() => {
                          console.log("Transfering playback to " + id);
                          spotify.setDeviceID(id);
      
                          musicSources[i].device.id = id;
                          musicSources[i].device.name = devName;
                          radioConfig.musicSources = JSON.stringify(musicSources);
                          return radioConfig.save()
                      })
                      .then((result) => {
                        return res.redirect('/spotify');
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
                }
              });
            }
          }
        }
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    }
}

exports.playerPlay = (req, res, next) => {

    spotify.play()
    .then(() => {
        console.log("Playback started");
        res.redirect('/spotify');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

}

exports.playerPause = (req, res, next) => {

    spotify.pause()
    .then(() => {
        console.log("Playback paused");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

    res.redirect('/spotify');
}

exports.playerNext = (req, res, next) => {

    spotify.next()
    .then(() => {
        console.log("Playback Next");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

    res.redirect('/spotify');
}

exports.playerPrevious = (req, res, next) => {

    spotify.previous()
    .then(() => {
        console.log("Playback Previous");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

    res.redirect('/spotify');
}

exports.postSetPlaylist = (req, res, next) => {
  const urlPlaylist = req.body.playlist;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/spotify?valid=' + JSON.stringify(errors.array()));
  }
  const playlistID = urlPlaylist.split("/playlist/")[1].split("?")[0];
  
  if(playlistID){
    spotify.getPlaylist(playlistID)
      .then(
        function (data) {
      if(data.body.name){

        Radio.findByPk(1)
        .then((radioConfig) => {
          
          if (radioConfig) {
            let musicSources = JSON.parse(radioConfig.musicSources);
            
            for (let i in musicSources) {
              if (musicSources[i].name == SRC_NAME) {
                musicSources[i].playlist = {};
                musicSources[i].playlist.id = playlistID;
                musicSources[i].playlist.name = data.body.name;
                musicSources[i].playlist.imageURL = data.body.images[0].url;
                
                spotify.setPlaylistID(playlistID);
                
                radioConfig.musicSources = JSON.stringify(musicSources);
                radioConfig.save();
                break;
              }
            }
          }
          res.redirect('/spotify');

        },
        function (err) {
          console.log("Something went wrong!", err);
        });
      }
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  }
}

exports.postClientLogin = (req, res, next) => { 
  const user = req.body.user;
  const password = req.body.password;
  const access_token = req.body.access_token;
  const refresh_token = req.body.refresh_token;
  const userData = JSON.parse(req.body.userData);


  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('login', {
      path: '/login',
      pageTitle: 'Login',
      userData: userData,
      access_token: access_token,
      refresh_token: refresh_token,
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });

  }
      exec(`sudo sed -i 's/.*LIBRESPOT_USERNAME.*=.*/LIBRESPOT_USERNAME = "${user}"/g' /etc/raspotify/conf && sudo sed -i 's/.*LIBRESPOT_PASSWORD.*=.*/LIBRESPOT_PASSWORD = "${password}"/g' /etc/raspotify/conf && sudo sed -i 's/.*LIBRESPOT_NAME.*=.*/LIBRESPOT_NAME = "${CLIENT_INI_NAME}"/g' /etc/raspotify/conf && sudo systemctl restart raspotify ; sleep 2s; tail -3 /var/log/daemon.log`, (err, stdout)=>{
      if(err){
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      }
      else{

        if(stdout.search("Connection failed: Login failed with reason: Bad credentials") != -1){
          console.log('----', stdout);
          
          return res.render('login', {
            path: '/login',
            pageTitle: 'Login',
            userData: userData,
            access_token: access_token,
            refresh_token: refresh_token,
            errorMessage: "Bad credentials"
          });
        }

        Radio.findByPk(1)
        .then((radioConfig) => {
          if(radioConfig){
            let musicSources = JSON.parse(radioConfig.musicSources);

            let index = musicSources.findIndex((src) => src.name === SRC_NAME);

            if(index == -1){
              index = (musicSources.push({ name: SRC_NAME,
                                  playlist: undefined,
                                  accessToken: access_token,
                                  refreshToken: refresh_token,
                                  device: {}
                                })
                      )-1;
            } else {
              musicSources[index].accessToken = access_token;
              musicSources[index].refreshToken = refresh_token;
            }

            spotify.setAccessToken(access_token);
            spotify.setRefreshToken(refresh_token);

            spotify.avaDevices()
            .then((data) => {
              let availableDevices = data.body.devices;

              let devIndex = availableDevices.findIndex((device) => device.name === CLIENT_INI_NAME);

              if(devIndex >=0 ){
                
                let id = availableDevices[devIndex].id;
                spotify.transDevice([id])
                .then(() => {
                    console.log("Transfering playback to " + id);
                    spotify.setDeviceID(id);

                    musicSources[index].device.id = id;
                    musicSources[index].device.name = CLIENT_INI_NAME;
                    radioConfig.musicSources = JSON.stringify(musicSources);
                    radioConfig.save()
                    .then((result) => {
                      return res.redirect('/spotify');
                    })
                    .catch(err => {
                      const error = new Error(err);
                      error.httpStatusCode = 500;
                      return next(error);
                    });

                })
                .catch(err => {
                  const error = new Error(err);
                  error.httpStatusCode = 500;
                  return next(error);
                });
              }else{
                radioConfig.musicSources = JSON.stringify(musicSources);
                radioConfig.save()
                .then((result) => {
                  return res.redirect('/spotify?valid=' + `[{"value":"","msg":"Client '${CLIENT_INI_NAME}' not found","param":"","location":""}]`);
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
          }else{
            return res.redirect('/spotify?valid=' + `[{"value":"","msg":"DB_item_not_found","param":"","location":""}]`);
          }
        })
        .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
      }
    });
  
};

exports.postSetActiveSrc = (req, res, next) => {
  const sourceName = req.body.source;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/spotify?valid=' + JSON.stringify(errors.array()));
  }

  Radio.findByPk(1)
  .then((radio) => {
    if (radio){
      radio.activeMusicSource = sourceName;
      return radio.save();
    }
  })
  .then(() => {
    musicPlayer.updateMusicSrc();
    return res.redirect('/spotify');
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};