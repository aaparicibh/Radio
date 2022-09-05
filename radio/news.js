const twitterAPI = require('../src/twitter');
const Twitter = require('../models/twitter');
const Radio = require('../models/radio');
const musicPlayer = require('./musicPlayer');
const ttsGen = require('./ttsGen');
const processTweets = require('./processTweets');

const PATH = ttsGen.PATH;
const Troubadour = require('troubadour');
const playProcess = new Troubadour('aplay');

let nToSpeech = undefined; //Numero total de audios de noticias a reproducir
let nSpeeching = undefined; //Numero de audio que se está reproduciendo
let date = undefined; // Momento en el que se obtienen las noticias

let paused = false;

function playingNews(){
  
  return nSpeeching !== undefined ? true : false;
}

function pauseResume(){

  if(!paused){
      console.log('\x1b[33m%s\x1b[0m','[News]', 'Pause');
      playProcess.pause();
  }else{
      console.log('\x1b[33m%s\x1b[0m','[News]', 'Resume');
      playProcess.resume();
  }
  
}

function next(){
  if ((nSpeeching+1) <= nToSpeech){
    console.log('\x1b[33m%s\x1b[0m','[News]', 'Next');
    nSpeeching++;
    playProcess.stop();
  }
}

function previous(){
  if ((nSpeeching-1) >= 0){
    console.log('\x1b[33m%s\x1b[0m','[News]', 'Previous');
    nSpeeching--;
    playProcess.stop();
  }
}

playProcess.on('pause', () => {
    console.log('\x1b[33m%s\x1b[0m','[News]', 'Paused');
    paused = true;
});

playProcess.on('resume', () => {
    console.log('\x1b[33m%s\x1b[0m','[News]', 'Resumed');
    paused = false;
});

playProcess.on('start', () => {
    // console.log('-inicia', nSpeeching, nToSpeech);
});

playProcess.on('end', (code) => {
    console.log('\x1b[33m%s\x1b[0m','[News]', '\x1b[31m[CODE]\x1b[0m', code);
    if(code == 0 || nSpeeching >= nToSpeech){// si no se ha matado el proceso o si se está fuera de rango (se estaba reproduciendo el último y se da a next)
     if((nSpeeching+1)<nToSpeech){
      nSpeeching++;
      playNews();
  
      }else{
        nToSpeech = undefined;
        nSpeeching = undefined;

        musicPlayer.play()
        .catch(err => {
          catchErr(err);
        });
      }
    }else{
      playNews();
    }
  });

playProcess.on('error', (error) => {
    console.log('\x1b[33m%s\x1b[0m', '[News]', '\x1b[31m[Error]\x1b[0m', error);
    nSpeeching = undefined;
    paused = false;
    musicPlayer.play()
    .catch(err => {
      catchErr(err);
    });
    
});


function getTweets(){
    return new Promise(function(resolve, reject) {
    Twitter.findAll()
      .then((users) => {
        if(users){
          Radio.findByPk(1)
          .then((radioConfig) => {
          let newsSources = JSON.parse(radioConfig.newsSources);
  
          let index = newsSources.findIndex((newsSources) => newsSources.name == "Twitter");
  
            if(index!==-1){
              let tweets = [];

              // (fecha_actual - max_horas_noticias) > (fecha_actual - fecha_ultima_noticia)
              let start_time = 
              (new Date (Date.now()-(radioConfig.newsFrecuency * 60 * 1000))).getTime() > (new Date (radioConfig.lastDate)) 
              ? 
              (new Date (Date.now()-(radioConfig.newsFrecuency * 60 * 1000))).toISOString() 
              :
              new Date(radioConfig.lastDate).toISOString();
              
              date = new Date(Date.now()).toISOString();

              for(let user of users){
                twitterAPI.getTweetsID(user.id, start_time, newsSources[index].maxNews)
                .then((result) => {
                    tweets.push({name: user.name, tweets: result.data});
                    console.log(tweets);

                    if(users.length === tweets.length){
                      resolve(tweets);
                    }
                })
                .catch(err => {
                  catchErr(err);
                });
              }
            }
          })
          .catch(err => {
            catchErr(err);
          });
        }
      })
      .catch(err => {
        catchErr(err);
      });
    });
  }
  
function playNews(){
  if(nSpeeching < nToSpeech){ //si la que se quiere reproducir existe, no está fuera de rango
    console.log('\x1b[33m%s\x1b[0m','[News]' + 'Playing', nSpeeching);
    playProcess.play(`${PATH}${nSpeeching}.wav`);
  }
}
  
async function generateTwitterNews(tweets){
  return await processTweets.procTweets(tweets);
}
  
  
async function runNews() {
  console.log('\x1b[33m%s\x1b[0m','[News]', 'ttsON:', ttsGen.generatingNews());

  let newsToSpeech = [];

  if(!ttsGen.generatingNews() && !playingNews()){
    let tweets = await getTweets();
    newsToSpeech = newsToSpeech.concat(await generateTwitterNews(tweets));

    nToSpeech = newsToSpeech.length;
    console.log('\x1b[33m%s\x1b[0m','[News]', 'nToSpeech', nToSpeech, newsToSpeech);
      
    ttsGen.tts(newsToSpeech, 0);
  }
}

function startPlay() {
  musicPlayer.pause()
  .then(() => {
      nSpeeching = 0;
      
      Radio.findByPk(1)
      .then((radioConfig) => {
        radioConfig.lastDate = date;
        
        return radioConfig.save();
      })
      .then(() => {
        return playNews();
      })
      .catch(err => {
        console.log(err);
      });
      
  })
  .catch(err => {
    console.log(err);
  });
}

function catchErr (err){
  console.log (err);
}

exports.runNews = runNews;
exports.playingNews = playingNews;
exports.pauseResume = pauseResume;
exports.next = next;
exports.previous = previous;
exports.startPlay = startPlay;
