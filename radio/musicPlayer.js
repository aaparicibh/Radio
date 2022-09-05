
const spotify = require('../src/spotify');
const Radio = require('../models/radio');
const {strings} = require('../util/strings');

let activeSrc;

function updateMusicSrc (){
    Radio.findByPk(1)
    .then((radio) => {
        if(radio){
            activeSrc = radio.activeMusicSource;
        }
    })
    .catch(err => {
      console.log(err);
    });
}

function start(){

    Radio.findByPk(1)
    .then((radio) => {
        if(radio){
            let musicSources = JSON.parse(radio.musicSources);
            activeSrc = radio.activeMusicSource;

            if(activeSrc == strings.spotify_src_name){
                let index = musicSources.findIndex((src) => src.name === strings.spotify_src_name);
    
                if(index !== -1 && musicSources[index].accessToken && musicSources[index].refreshToken){
                    spotify.setAccessToken(musicSources[index].accessToken);
                    spotify.setRefreshToken(musicSources[index].refreshToken);
                    
                    spotify.setDeviceID(musicSources[index].device.id);
                    spotify.transDevice([musicSources[index].device.id]);
                    if(musicSources[index].playlist){
                        spotify.setPlaylistID(musicSources[index].playlist.id);
                    }
                }
            }

        }
    })
    .catch(err => {
      console.log(err);
    });

}

function play(){
    if (activeSrc == strings.spotify_src_name){
        return spotify.play();
    }
}

function pause(){
    if (activeSrc == strings.spotify_src_name){
        return spotify.pause();
    }
}

function next(){
    if (activeSrc == strings.spotify_src_name){
        return spotify.next();
    }
}

function previous(){
    if (activeSrc == strings.spotify_src_name){
        return spotify.previous();
    }
}

exports.updateMusicSrc = updateMusicSrc;
exports.start = start;
exports.play = play;
exports.pause = pause;
exports.next = next;
exports.previous = previous;

