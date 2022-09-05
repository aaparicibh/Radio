const numToLeters = require('../util/numToLeters');
const twitterAPI = require('../src/twitter');
const {strings} = require('../util/strings');


function numbersToLetters(tweet){

    let numbers = tweet.match(/[0-9]+([,\.][0-9]+)?/g);
    
    if(numbers){
        for(let number of numbers){
            tweet = tweet.replace(number, numToLeters.numeroALetras(Number(number.replace(",","."))));
        }
    }
    
    return tweet;
}

async function usersNames(tweet){

    try{

        let users = tweet.match(/\@[A-Za-z0-9_]*/g);

        if(users){
            for(let user of users){
                let result = await twitterAPI.userInfoV2(user.replace('@', ''));
                
                if(result.data){
                    tweet = tweet.replace(user, result.data[0].name);
                }
            }
        }

        return tweet;

    } catch (err) {
        throw err;
    }
}

async function procTweets(jsonTweets){

        if(jsonTweets.every(element => element.tweets === undefined)){
            return [strings.no_news];
        }else{
            let tweetsArray=[];
            for(userTweets of jsonTweets){
                if(userTweets.tweets !== undefined){
                    let auxArray =[];
                    auxArray.push(userTweets.name + strings.news_head_1 + userTweets.tweets.length + strings.news_head_2);
        
                    for(index in userTweets.tweets){
                        let tweet = userTweets.tweets[index].text.replace(/[ ]?(?:https?|ftp):\/\/[\n\S]+/g, '');
                        if (tweet.trim() != ""){
                            auxArray.push(index + ". " + tweet +".");
                        }
                    }
                    if(auxArray.length > 1){
                        tweetsArray = tweetsArray.concat(auxArray);
                    }
                }
            }

            for(let i in tweetsArray){
                tweetsArray[i] = await usersNames(tweetsArray[i]); // El orden es importante
                tweetsArray[i] = numbersToLetters(tweetsArray[i]);
            }
            return tweetsArray;
        }
  }

exports.procTweets = procTweets;
