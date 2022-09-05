const SpotifyWebApi = require('spotify-web-api-node');
const credentials = require('./credentials');
const Radio = require('../models/radio');
const exec = require('child_process').exec;
const {strings} = require('../util/strings');

let deviceID = undefined;
let playlistID = undefined;

const spotifyApi = new SpotifyWebApi({
  clientId: credentials.spotify.clientId,
  clientSecret: credentials.spotify.clientSecret,
  redirectUri: credentials.spotify.redirectUri
});

function setAccessToken(token){
    spotifyApi.setAccessToken(token);
}
function setRefreshToken(token){
    spotifyApi.setRefreshToken(token);
}

function setDeviceID(devID){
  deviceID = devID;
}
function setPlaylistID(plID){
  playlistID = plID;
}


function avaDevices(op=null, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','AvaDevices');
    
    return aux(spotifyApi.getMyDevices.bind(spotifyApi), avaDevices, checkErr);
}

const ERRLIST = ['The access token expired', 'Player command failed: No active device found', 'Device not found', 'Player command failed: Restriction violated'];
const CHECKERR = [0,0,0,0];

function fixErr(errMsg, checkErr){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]', 'err to fix: ', errMsg);
    console.log('\x1b[32m%s\x1b[0m','[Spotify]', 'checkErr:', checkErr);
    
    return new Promise(function(resolve, reject) {
      if(errMsg === ERRLIST[0] && checkErr[0] < 2){
        checkErr[0]++;
        refreshAccessToken()
        .then(
            function(data) {
              console.log('The access token has been refreshed!');
          
              setAccessToken(data.body['access_token']);
              Radio.findByPk(1)
              .then((radioConfig) => {
                
                if (radioConfig) {
                  let musicSources = JSON.parse(radioConfig.musicSources);  

                  let index = musicSources.findIndex((musicSources) => musicSources.name == strings.spotify_src_name);

                  if (index !== -1) { 
                    musicSources[index].accessToken = data.body['access_token'];
                    radioConfig.musicSources = JSON.stringify(musicSources);
                    radioConfig.save();
                  }
                  
                  resolve(true);
                }
              });
            },
            function(err) {
              console.log('Could not refresh access token', err);
            }
          );
      } else if(errMsg === ERRLIST[1] && checkErr[1] < 2){
        checkErr[1]++;

        exec(`sudo systemctl restart raspotify; sleep 2s`, (err, stdout)=>{
          if(err){
            console.log(err);
            reject();
          }
          else{
            transDevice([deviceID], checkErr)
            .then(() => {
              resolve(true);
            })
            .catch(err => {
              console.log(err);
              reject();
            });
          }
        });

      } else if(errMsg === ERRLIST[2] && checkErr[2] < 2){
        checkErr[2]++;
        exec(`sudo systemctl restart raspotify; sleep 2s`, (err, stdout)=>{
          if(err){
            console.log(err);
            reject();
          }
          else{
            resolve(true);
          }
        });

      } else if(errMsg === ERRLIST[3] && checkErr[3] < 2){
        checkErr[3]++;
        
        transDevice([deviceID], checkErr)
        .then(() => {
          resolve(true);
        })
        .catch(err => {
          console.log(err);
          reject();
        });
      } else{
        resolve(false);
      }
      
    
  });
}

function aux (funcSpotify, func, checkErr, arg){
  
  return new Promise(function(resolve, reject) {
    funcSpotify(arg)
    .then((result) => {
        console.log('\x1b[32m%s\x1b[0m', '[Spotify]', "Done");
        if(func === play){
          playlistID = undefined;
        }
        resolve(result);
    })
    .catch(err => {
      console.log('\x1b[32m%s\x1b[0m', '[Spotify]', '\x1b[31m[Error]\x1b[0m');
      if(err.body.error){
        fixErr(err.body.error.message, checkErr)
        .then((result) => {
          if(!result){
            return reject(err);
          }else{
            return func(arg, checkErr);
          }
        })
        .then(() => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
      }else{
        console.log(err.body);
        reject(err);
      }
      
    });
  });
}

function play(op=null, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','Play');

    let options = playlistID? `spotify:playlist:${playlistID}`:undefined;

    return aux(spotifyApi.play.bind(spotifyApi), play, checkErr, {"context_uri": options});
}

function pause(op=null, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','Pause');

    return aux(spotifyApi.pause.bind(spotifyApi), pause, checkErr);
}

function transDevice (deviceIds, checkErr = [...CHECKERR]){
  console.log('\x1b[32m%s\x1b[0m','[Spotify]','Transfer Device');

  return aux(spotifyApi.transferMyPlayback.bind(spotifyApi), transDevice, checkErr, deviceIds);
}

function next(op=null, checkErr = [...CHECKERR]){
  console.log('\x1b[32m%s\x1b[0m','[Spotify]','Next');

  return aux(spotifyApi.skipToNext.bind(spotifyApi), next, checkErr);
}

function previous(op=null, checkErr = [...CHECKERR]) {
    console.log('\x1b[32m%s\x1b[0m', '[Spotify]', 'Previous');

    return aux(spotifyApi.skipToPrevious.bind(spotifyApi), previous, checkErr);
}

function status (op=null, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','Status');

    return aux(spotifyApi.getMyCurrentPlaybackState.bind(spotifyApi), status, checkErr);
}

function getPlaylist (id, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','Get Playlist');

    return aux(spotifyApi.getPlaylist.bind(spotifyApi), getPlaylist, checkErr, id);
}

function addToQueue (uri, checkErr = [...CHECKERR]){
  console.log('\x1b[32m%s\x1b[0m','[Spotify]','Add To Queue');

  return aux(spotifyApi.addToQueue.bind(spotifyApi), addToQueue, checkErr, uri);
}

function playPlaylist (id){
    getPlaylist(id)
    .then((data) => {
        console.log('Playlist:', data.body.name);
        
        for(item of data.body.tracks.items){
            console.log('\t"'+item.track.name+'"\tAñadida\t', item.track.uri,);
            addToQueue(item.track.uri)
            .then((data) => {
              console.log(data.body);
              
            })
            .catch(err => {
              console.log(err);
            });
        }
        
        console.log('next');
        
        next()
        .then((data) => {
            console.log(data.body);
        })
        .catch(err => {
            console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
    });
}

function refreshAccessToken (op=null, checkErr = [...CHECKERR]){
    console.log('\x1b[32m%s\x1b[0m','[Spotify]','Refresh Access Token');
    return aux(spotifyApi.refreshAccessToken.bind(spotifyApi), refreshAccessToken, checkErr);
}


exports.setAccessToken = setAccessToken;
exports.setRefreshToken = setRefreshToken;
exports.setDeviceID = setDeviceID;
exports.setPlaylistID = setPlaylistID;
exports.refreshAccessToken = refreshAccessToken;
exports.avaDevices = avaDevices;
exports.play = play;
exports.pause = pause;
exports.transDevice = transDevice;
exports.next = next;
exports.previous = previous;
exports.status = status;
exports.getPlaylist = getPlaylist;
exports.addToQueue = addToQueue;
exports.playPlaylist = playPlaylist;
