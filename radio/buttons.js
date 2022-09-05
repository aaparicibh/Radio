const Radio = require('../models/radio');
const exec = require('child_process').exec;
const news = require('./news');
const musicPlayer = require('./musicPlayer');
const ttsGen = require('./ttsGen');
const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO

//Buttons
const playButton = new Gpio(22, 'in', 'both', {debounceTimeout: 10}); 
const volumeIncrButton = new Gpio(5, 'in', 'both', {debounceTimeout: 10});
const volumeDecrButton = new Gpio(6, 'in', 'both', {debounceTimeout: 10});
const nextButton = new Gpio(26, 'in', 'both', {debounceTimeout: 10});
const previousButton = new Gpio(27, 'in', 'both', {debounceTimeout: 10});

///////////

let intervalid = undefined;

let encendido = false; //que coja el valor de status o algo


volumeIncrButton.watch((err, value) => {
  if(value == 1){
    console.log('\x1b[36m%s\x1b[0m','[Action]', 'Volumen +');
    exec(`amixer -c 3 sset Playback 2db+`, (err, stdout)=>{
      if(err){
        console.log(err);
      }
      else{
        // console.log(stdout);
        console.log('Vol:', '\x1b[46m', stdout.slice(stdout.search(/\[[0-9]*\%\]/g)+1, stdout.search(/\%\]/g)+1), '\x1b[0m');        
      }
    });
  }
});

volumeDecrButton.watch((err, value) => {
  if(value == 1){
    console.log('\x1b[36m%s\x1b[0m','[Action]', 'Volumen -');
    exec(`amixer -c 3 sset Playback 2db-`, (err, stdout)=>{
      if(err){
        console.log(err);
      }
      else{
        // console.log(stdout);
        console.log('Vol:', '\x1b[46m', stdout.slice(stdout.search(/\[[0-9]*\%\]/g)+1, stdout.search(/\%\]/g)+1), '\x1b[0m');   
      }
    });
  }
});

nextButton.watch((err, value) => {
  if(value == 1 && encendido){
    console.log('\x1b[36m%s\x1b[0m','[Action]', 'Next');
    
    if(news.playingNews()){
      news.next();
    }else{
      musicPlayer.next()
      .catch(err => {
        catchErr(err);
      });
    }
  }
});

previousButton.watch((err, value) => {
  if(value == 1 && encendido){
    console.log('\x1b[36m%s\x1b[0m','[Action]', 'Previous');
    if(news.playingNews()){
      news.previous();
    }else{
      musicPlayer.previous()
      .catch(err => {
        catchErr(err);
      });
    }
  }
});

playButton.watch((err, value) => {
  
  if(value == 1){
    console.log('\x1b[36m%s\x1b[0m','[Action]', 'Play:', (encendido ? "play" : "pause"), 'to', (!encendido ? "play" : "pause"));
    
    if(news.playingNews()){
        news.pauseResume();

    } else if(!encendido){
      
        musicPlayer.play()
        .then(() => {

            if(ttsGen.generatingNews()){
              ttsGen.resume();
            } else {
              news.runNews();
            } 

            encendido = true;
            Radio.findByPk(1)
            .then((radioConfig) => {

              let date_ob = new Date(Date.now());

              console.log('Timestamp:', date_ob.getFullYear() + "-" + date_ob.getMonth() + 1 + "-" + date_ob.getDate(), date_ob.getHours() +":"+date_ob.getMinutes()+":"+date_ob.getSeconds(), 'Frec:', radioConfig.newsFrecuency);

              
              if (radioConfig.newsFrecuency) {
                  intervalid = setInterval(news.runNews, (radioConfig.newsFrecuency - 0)*60*1000, radioConfig.newsFrecuency);
              }
            });
        })
        .catch(err => {
          catchErr(err);
        });
    }else{
      musicPlayer.pause()
        .then(() => {
            encendido = false;

            if(ttsGen.generatingNews()){
              ttsGen.pause();
            }
            
            clearInterval(intervalid);
        })
        .catch(err => {
          catchErr(err);
        });
    }
  }
}); 

process.on('SIGINT', function () { //on ctrl+c
  console.log("Salida");

  musicPlayer.pause()
    .then(() => {
        console.log("Playback paused");
        clearInterval(intervalid);
        
        playButton.unexport(); // Unexport Button GPIO to free resources
        process.exit(); //exit completely
    })
    .catch(err => {
      catchErr(err);
    });

});

function catchErr (err){
  console.log (err);
}
