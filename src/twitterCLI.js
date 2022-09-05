const twitter = require('./twitter');
const readLineSync = require("readline-sync"); //para la entrada de texto del usuario

function menu(){
    console.log(`
      ----------
      | MENU
      ----------
      1. Tweets por id (ej: 104485966)
      2. User info (ej: cextremadura)
      
      0. Salir
  --------------`
  
    );
  
    let userRes = readLineSync.question("Pick an option -> ");
    console.log('--------------');
    
    if(userRes === '1'){
      let id = readLineSync.question("Pick an id -> ");
      
      twitter.getTweetsID(id)
      .then((result) => {
        console.log(result);
        menu();
      })
      .catch(err => {
        console.log(err);
      });
    } else if(userRes === '2'){
      let screenName = readLineSync.question("Pick an screen name -> ");
      twitter.userInfoV2(screenName)
      .then((result) => {
        console.log(result);
        menu();
      })
      .catch(err => {
        console.log(err);
      });

    } else if(userRes === '0'){
      return;
    } else{
      menu();
    }
  }
  
  menu();
