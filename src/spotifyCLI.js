const spotify = require('./spotify');
const readLineSync = require("readline-sync"); //para la entrada de texto del usuario
//Añadir tokens para usarlo
const AccessToken = '';
const resfreshToken = '';

spotify.setAccessToken(AccessToken);
spotify.setRefreshToken(resfreshToken);


function menu(){
    
    console.log(`
      ----------
      | MENU
      ----------
      1. Play / resume
      2. Pause
      3. Available devices
      4. Transfer playback (id)
      5. Next
      6. Status
      7. Get playlist (ej: 37i9dQZF1DWYhOCyaaShf8)
      8. Play playlist (ej: 37i9dQZF1DWYhOCyaaShf8)
      9. Previous
    
      0. Salir
  --------------`
  
    );
  
    let userRes = readLineSync.question("Pick an option -> ");
    console.log('--------------');
    
    if (userRes === "1") {//play
        spotify.play().then(
        function () {
          console.log("Playback started");
          menu();
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "2") {//pause
        spotify.pause().then(
        function () {
          console.log("Playback paused");
          menu();
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "3") {//available devices
        spotify.avaDevices().then(
        function (data) {
          let availableDevices = data.body.devices;
          console.log(availableDevices);
          menu();
        },
        function (err) {
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "4") {//transfer device
      let id = readLineSync.question("Pick an device id -> ");
      spotify.transDevice([id]).then(
        function () {
          console.log("Transfering playback to " + id);
          menu();
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "5") {//next

        spotify.next().then(
        function () {
          console.log("Skip to next");
          menu();
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "6") {//status

        spotify.status().then(
          function (data) {
            // Output items
            if (data.body && data.body.is_playing) {
              console.log("User is currently playing something!");
            } else {
              console.log(
                "User is not playing anything, or doing so in private."
              );
            }
            menu();
          },
          function (err) {
            console.log("Something went wrong!", err);
          }
        );
    } else if (userRes === "7") {//get playlist
        let id = readLineSync.question("Pick an id -> ");

        spotify.getPlaylist(id).then(
          function (data) {
            // Output items
            // console.log(data.body.tracks.items);
            console.log(data.body);
            
            menu();
          },
          function (err) {
            console.log("Something went wrong!", err);
          }
        );
    } else if (userRes === "8") {//play playlist
        let id = readLineSync.question("Pick an id -> ");

        spotify.playPlaylist(id);
    } else if (userRes === "9") {//previous

        spotify.previous().then(
        function () {
          console.log("Skip to previous");
          menu();
        },
        function (err) {
          //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
          console.log("Something went wrong!", err);
        }
      );
    } else if (userRes === "0") {
      return;
    } else {
      menu();
    }
  }

spotify.refreshAccessToken()
.then(
    function(data) {
      console.log('The access token has been refreshed!');
  
      spotify.setAccessToken(data.body['access_token']);
      menu();
    },
    function(err) {
      console.log('Could not refresh access token', err);
    }
  );
