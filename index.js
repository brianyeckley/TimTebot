const Discord = require("discord.js");
const config = require("./config.json");
const quotes = require("./quotes.json")
const fs = require('fs');

const prefix = "!";
const client = new Discord.Client();

client.on("message", function(message) { 
    if (message.author.bot) return;

    if (message.mentions.users.first() && message.mentions.users.first().username === 'TimTebot') {
        const quote = quotes.Quotes[Math.floor(Math.random() * quotes.Quotes.length)];

        message.channel.send(quote);
    }

    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    let data = load();

    if (command === 'register') {
        console.log(data);
        const name = args[0];
        
        args.shift();

        const team = args.join(' ');

        data.Players.push({ Name: name, Team: team, Username: message.author.username });

        message.reply(`Welcome coach ${name} of ${team}!`);
    }
    else if (command === 'list') {
        reply = `Current players:`;

        data.Players.forEach(player => {
            reply += `\n\t${player.Name}: ${player.Team}`;
        });

        message.reply(reply);
    }
    else if (command === 'result') {
        // Format "21-10 georgia state university"
        if (!data.Results)
            data.Results = [];

        const player = data.Players.find(player => player.Username == message.author.username);
        const score = args[0];

        args.shift();

        data.Results.push({ Coach: player.Name, Score: score, Opponent: args.join(' ') });
    }

    save(data);
});

client.login(config.BOT_TOKEN);

const save = (data) => {
    const dataJson = JSON.stringify(data);

    // write JSON string to a file
    fs.writeFileSync('data.json', dataJson);
}

const load = () => {
    data = fs.readFileSync('data.json', 'utf-8');

    const dataObject = JSON.parse(data.toString());
    
    console.log(dataObject);
    return dataObject;
}