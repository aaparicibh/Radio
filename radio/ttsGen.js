const Troubadour = require('troubadour');
const ttsProcess = new Troubadour('tts');
const news = require('./news.js');

const PATH ='./temp/play/';

let newsArray = undefined;
let number = 0;
let paused = false;
let ttsON = false;

function tts (news, number){
  newsArray = news;
  ttsON = true;
  number = 0;
  generate(newsArray, number);
}

function pause (){
  if(!paused){
      console.log('\x1b[33m%s\x1b[0m','[TTS]', 'Pause');
      ttsProcess.pause();
  }
}

function resume (){
  if(paused){
    console.log('\x1b[33m%s\x1b[0m','[TTS]', 'Resume');
    ttsProcess.resume();
  }
}

function generate (){
  console.log('\x1b[33m%s\x1b[0m', '[TTS]','Processing', number);
  ttsProcess.start(["--model_name", "tts_models/es/mai/tacotron2-DDC", "--out_path", `${PATH}${number}.wav`, "--text", `${newsArray.shift()}`]);
}

ttsProcess.on('pause', () => {
    console.log('\x1b[33m%s\x1b[0m','[TTS]', 'Paused');

    paused = true;
});

ttsProcess.on('resume', () => {
    console.log('\x1b[33m%s\x1b[0m','[TTS]', 'Resumed');

    paused = false;
});

ttsProcess.on('start', () => {
    console.log('\x1b[33m%s\x1b[0m', '[TTS]', 'Processing');
});

ttsProcess.on('end', (code) => {
    console.log('\x1b[33m%s\x1b[0m', '[TTS]', '\x1b[31m[CODE]\x1b[0m', code);
    if(code == 0){
      if(newsArray.length > 0){
        number += 1;
        generate();
      }else{
        ttsON = false;
        number = 0;
        if(!news.playingNews()){
          news.startPlay();
        }
      }
    } else {
      ttsON = false;
      number = 0;
    }

  });

ttsProcess.on('error', (error) => {
    console.log('\x1b[33m%s\x1b[0m', '[TTS]', '\x1b[31m[Error]\x1b[0m', error);
    ttsON = false;
});

function generatingNews(){
  return ttsON;
}

exports.tts = tts;
exports.pause = pause;
exports.resume = resume;
exports.PATH = PATH;
exports.generatingNews = generatingNews;