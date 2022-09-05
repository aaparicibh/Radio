const credentials = require('./credentials'); //fichero en el que se almacenan los credenciales

const { TwitterApi } = require('twitter-api-v2'); //librería de la api
  
const twitterClient = new TwitterApi({
  appKey: credentials.twitter.apikey,
  appSecret: credentials.twitter.apiSecretKey,
  accessToken: credentials.twitter.accessToken,
  accessSecret: credentials.twitter.accessTokenSecret,
  bearerToken: credentials.twitter.bearerToken
});

const rwClient = twitterClient.readWrite;

// Obtener informacion de una persona por screenName
function userInfoV2(screenName){
  return rwClient.v2.usersByUsernames(screenName, { 'user.fields': ['profile_image_url'] })
}

// Obtener tweets de una persona por ID
function getTweetsID(id, start_time, max_result){
  
  return rwClient.v2.get(`users/${id}/tweets`, {'start_time': start_time, 'max_results': max_result, 'tweet.fields':['author_id', 'created_at'], 'exclude': 'retweets,replies'});
}


exports.userInfoV2 = userInfoV2;
exports.getTweetsID = getTweetsID;