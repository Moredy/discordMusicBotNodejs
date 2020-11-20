/**
 * Module Imports
 */
const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { join } = require("path");
const firebase = require("firebase");
const database = require("./util/database");
const ytdl = require("ytdl-core");
const YouTubeAPI = require("simple-youtube-api");
const skip = require("./commands/skip.js");
const play = require("./commands/play.js");
const leave = require("./commands/stop.js");
const reapet = require("./commands/loop.js");
const volume = require("./commands/volume.js");
const resume = require("./commands/resume.js");
const pause = require("./commands/pause.js");

let TOKEN, PREFIX, YOUTUBE_API_KEY;
try {
  const config = require("./config.json");
  TOKEN = config.TOKEN;
  PREFIX = config.PREFIX;
  YOUTUBE_API_KEY = config.YOUTUBE_API_KEY;
} catch (error) {
  TOKEN = process.env.TOKEN;
  PREFIX = process.env.PREFIX;
  YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
}

const youtube = new YouTubeAPI(YOUTUBE_API_KEY);

const client = new Client({ disableMentions: "everyone" });

client.login(TOKEN);
client.commands = new Collection();
client.prefix = PREFIX;
client.queue = new Map();
const cooldowns = new Collection();
const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Client Events
 */
client.on("ready", () => {
  console.log(`${client.user.username} ready!`);
  client.user.setActivity(`${PREFIX}help and ${PREFIX}play`, { type: "LISTENING" });

  client.channels.fetch("721522862715830314").then(channel => {
    channel.send("-play sinc");
  });
});
client.on("warn", info => console.log(info));
client.on("error", console.error);

/**
 * Import all commands
 */

const commandFiles = readdirSync(join(__dirname, "commands")).filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", `${file}`));
  client.commands.set(command.name, command);
}

client.on("message", async message => {
  let loop = false;

  if (!message.guild) return;

  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(PREFIX)})\\s*`);
  if (!prefixRegex.test(message.content)) return;

  
  
  let i = 0;

  if (i == 0) {
    var FirstMessage = message;
    i++;
  } else {
    message = FirstMessage;
  }

  //IDENTIFICAR TASKS
  const Tasks = firebase.database().ref("task/");
  const UserVolume = firebase.database().ref("user/volume");
  const User = firebase.database().ref("user");
  const nowPlaying = firebase.database().ref("nowPlaying");
  const QueueList = firebase.database().ref("queue/");
  let a = 0;
  let b = 0;

  UserVolume.on("value", function(snapshot) {
    if (snapshot.val() != null) {
      console.log(snapshot.val());
      volume.execute(message, [snapshot.val()]);
    }
  });

  Tasks.on("child_added", async function(snapshot, prevChildKey) {
    try {
      //console.log(snapshot)
      let taskKey = prevChildKey; //Object.keys(snapshot.val())[0];

      //let taskArraySize = Object.keys(snapshot.val()).length;

      //console.log(taskArraySize);

      let lastTaskMusicName = snapshot.val().title; //snapshot.val()[Object.keys(snapshot.val())[taskArraySize - 1]].title;

      let lastTaskDiscordID = snapshot.val().discordIDbot; //snapshot.val()[Object.keys(snapshot.val())[taskArraySize - 1]].discordIDbot;

      let lastTaskType = snapshot.val().type; //snapshot.val()[Object.keys(snapshot.val())[taskArraySize - 1]].type;

      // REGISTRA A MUSICA DA TASK PRO QUEUE
      var queueKey = firebase
        .database()
        .ref()
        .child("task")
        .push().key;

      //console.log("LAST: " + lastTaskMusicName);

      const results = await youtube.searchVideos(lastTaskMusicName, 1);

      //console.log (results);

      let songInfo = await ytdl.getInfo(results[0].url);

      //console.log (songInfo)

      if (lastTaskType == "addMusic") {
        const Queue = firebase.database().ref("queue/" + queueKey);

        console.log(lastTaskDiscordID);

        Queue.set({
          discordIDbot: lastTaskDiscordID,
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds,
          viewCount: songInfo.videoDetails.viewCount,
          thumbnail: songInfo.videoDetails.thumbnail.thumbnails[3].url
        });

        setTimeout(function() {
          Tasks.remove();
        }, 3000);
      } else if (lastTaskType == "nextTrack") {
        console.log("PULEI");
        skip.execute(message);

        setTimeout(function() {
          Tasks.remove();
        }, 3000);
        /*
            queue.playing = true;
            queue.connection.dispatcher.end();*/

        /*
          client.channels.fetch("721522862715830314").then(channel => {
            channel.send("!skip");
          });*/
      } else if (lastTaskType == "leave") {
        leave.execute(message);
        Tasks.remove();
        User.remove();
        nowPlaying.remove();
        QueueList.remove();
        //client.setVoiceChannel(null);
        setTimeout(function() {
          process.exit(1);
        }, 3000);
      } else if (lastTaskType == "reapet") {
        reapet.execute(message);

        setTimeout(function() {
          Tasks.remove();
        }, 3000);
      } else if (lastTaskType == "mute") {
        if (b % 2 == 0) {
          volume.execute(message, ["0"]);
          b++;
        } else {
          UserVolume.once("value", function(snapshot) {
            if (snapshot.val() != null) {
              volume.execute(message, [snapshot.val()]);
            } else {
              volume.execute(message, ["100"]);
            }
          });
          b++;
        }

        setTimeout(function() {
          Tasks.remove();
        }, 3000);
      } else if (lastTaskType == "play/pause") {
        if (a % 2 == 0) {
          pause.execute(message);
          a++;
        } else {
          resume.execute(message);
          a++;
        } 

        setTimeout(function() {
          Tasks.remove();
        }, 3000);
      } else if (lastTaskType == "verificarID") {
          
          
          
        }
    } catch (err) {
      console.log("Nenhuma task encotrada ou sua YOUTUBE API não está valida. ERRO:");
      console.log(err);
    }
  });

  //----------------------------------------------------------------------------------------------------------------
  //console.log (message)
  //if (message.author.bot) return;

  const [, matchedPrefix] = message.content.match(prefixRegex);

  const args = message.content
    .slice(matchedPrefix.length)
    .trim()
    .split(/ +/);
  const commandName = args.shift().toLowerCase();
  

  if (message.content.includes(PREFIX+"verificarID")){
    
    
    
    Tasks.on("child_added", async function(snapshot, prevChildKey) {
      
    if (snapshot.val().type == 'verificarID') {
      
      let verificarID = snapshot.val().verificarID
    
      if(message.author.id == verificarID) {
        
        User.update({
          discordID: message.author.id
        }).then(
          Tasks.remove());
        
        } else {
        Tasks.remove()
        message.reply("ID não confere !")
        }
      
      }
    });
    
    
  console.log (args[0]) }

  const command =
    client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    //OBSERVADOR DA QUEUE
    var Queue = firebase.database().ref("queue/");
    Queue.on("child_added", async function(snapshot) {
      try {
        console.log("QAAAAAAAAA");
        console.log(snapshot.val());

        let queueArraySize = Object.keys(snapshot.val()).length;

        const songUrl = await snapshot.val().url; //await snapshot.val()[Object.keys(snapshot.val())[queueArraySize - 1]].url;
        const discordIDbot = await snapshot.val().discordIDbot; //await snapshot.val()[Object.keys(snapshot.val())[queueArraySize - 1]].discordID;

        console.log(songUrl, discordIDbot);

        play.execute(message, args, songUrl, discordIDbot);
      } catch (err) {
        console.log("Nada encontrado na queue.");
      }
    });
  } catch (error) {
    console.error(error);
    message.reply("There was an error executing that command.").catch(console.error);
  }
});
