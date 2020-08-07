const { Client, MessageAttachment } = require('discord.js')
const ytdl = require("ytdl-core");
const { getInfo } = require('ytdl-getinfo')
const { prefix } = require('./config/config.json');

require('dotenv').config();

const client = new Client({ disableEveryone: true });

const queue = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on('guildMemberAdd', member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'member-log');

  if (!channel) return;

  channel.send(`Um novo gado entrou no oDOGB, ${member}`);
});

client.on('message', msg => {

  if (msg.author.bot) return;

  if (!msg.content.startsWith(prefix) && !msg.content.match(`^<@!?${client.user.id}> `)) {
    return
    /*//ID Bot when logging into the server
    let mentionedMember = msg.mentions.members.first();

    if (!mentionedMember) {
      return;
    }

    if (mentionedMember.user.discriminator !== client.user.discriminator) {
      return;
    }*/
  }

  const serverQueue = queue.get(msg.guild.id);

  if (msg.content.startsWith(`${prefix}play`)) {
    
    execute(msg, serverQueue);
    return;
  
  } else if (msg.content.startsWith(`${prefix}q`)) {
    
    viewQueue(msg, serverQueue);
    return;

  } else if (msg.content.startsWith(`${prefix}skip`)) {
    
    skip(msg, serverQueue);
    return;

  } else if (msg.content.startsWith(`${prefix}stop`)) {
    
    stop(msg, serverQueue);
    return;

  } else if (msg.content.toLowerCase() === `${prefix}ping`) {

    msg.reply('Pong!');

  } else if (msg.content.toLowerCase() === `${prefix}labaxurias`) {
   
    msg.reply('xerebecantarás!');
  
  } else if (msg.content.toLowerCase() === `${prefix}victor-ben10`) {
   
    const attachment = new MessageAttachment('https://media.discordapp.net/attachments/740744745973710899/740756572132737114/428201_272973329447738_33666600_n.jpg?width=633&height=475');
    msg.channel.send(attachment);
    
  } else {
    msg.reply("Sorry, I didn't understand your command. Please check and try again!");
  }

});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  let url;

  if (args[1].includes('youtube.com')) {
    url = args[1];
  } else {
    url = await getInfo(args[1], ['--format=bestaudio', '--default-search=ytsearch']).then(info => {
      return info.items[0].url;    
    })
  }

  const songInfo = await ytdl.getInfo(url);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
    duration: songInfo.videoDetails.lengthSeconds / 60,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to skip the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function viewQueue(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to skip the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");

  let playlist = serverQueue.songs.map(music => {
    return `${music.title}   -   ${music.duration.toFixed(2).replace('.',':')}`;
  });

  return message.channel.send(playlist);
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, {
      filter: 'audioonly'
    })).on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    }).on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(process.env.token);