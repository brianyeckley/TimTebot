const Discord = require("discord.js");
const config = require("./config.json");
const quotes = require("./quotes.json")
const fs = require('fs');

const prefix = "!";
const client = new Discord.Client();

// None of this will work with multiple servers or concurrent DM's, idgaf right now
let advanceState = {
    completed: true,
    coachIndex: 0,
    needsHomeAway: true,
    needsOpponent: true
}

client.on("message", function(message) { 
    if (message.author.bot) return;

    if (message.mentions.users.first() && message.mentions.users.first().username === 'TimTebot') {
        const quote = quotes.Quotes[Math.floor(Math.random() * quotes.Quotes.length)];

        message.channel.send(quote);
    }

    if (!message.content.startsWith(prefix) && message.channel.type != 'dm') return;

    let data = load();

    if (message.channel.type == 'dm') {
        handleDM(data, message);
    }

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'help') {
        let help = `\`!register Brian Colorado Buffaloes\``;
        help += "\n\`!list\`";
        help += "\n\`!result - 29-14\` (your score first)";
        help += "\n\`!advance\` and we'll have a chat";
        help += "\n\`!current\`";
        help += "\n\nThank *you* for using TimTebot!";

        message.channel.send(help);
    }
    else if (command === 'register') {
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
        console.log(args);
        const player = data.Players.find(player => player.Username == message.author.username);
        const scores = args[0].split('-');

        const currentGame = data.CurrentWeek.find(game => game.Coach == player.Name);
        currentGame.Score = args[0];
        currentGame.Result = scores[0] > scores[1] ? 'W' : 'L';

        if (currentGame.Result === 'W') {
            message.reply('congratulations!');
        }
        else {
            message.reply('oof, sorry.');
        }
    }
    else if (command === 'advance') {
        advance(data, message);

        outputGames(data, message);
    }
    else if (command === 'current') {
        outputGames(data, message);
    }
    else if (command == 'shutdown') {
        message.reply('BYE :middle_finger:').then(() => process.exit());
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

const outputGames = (data, message) => {
    data.CurrentWeek.forEach(game => {
        if (game.Home.toLowerCase() === 'bye') {
            message.channel.send(`${game.Coach} has a bye week.`);
        } else {
            const atOrVs = game.Home.toLowerCase() === 'home' ? 'vs' : 'at';

            if (game.Result) {
                message.channel.send(`${game.Coach} ${atOrVs} ${game.Opponent} ${game.Result === 'W' ? ':regional_indicator_w:' : ':regional_indicator_l:'} (${game.Score})`);
            }
            else {
                message.channel.send(`${game.Coach} ${atOrVs} ${game.Opponent}`);
            }
        }
    });
}

const handleDM = (data, message) => {
    console.log(`received dm from ${message.author}`);
    console.log(advanceState);
    if (advanceState.completed) {
        message.reply('sup');
        return;
    }

    if (advanceState.needsHomeAway) {
        const player = data.Players[advanceState.coachIndex];

        if (message.content.toLowerCase() === 'home') {
            advanceState.needsHomeAway = false;
            advanceState.game.Home = 'home';
        }
        else if (message.content.toLowerCase() === 'away') {
            advanceState.needsHomeAway = false;
            advanceState.game.Home = 'away';
        }
        else if (message.content.toLowerCase() === 'bye') {
            advanceState.needsHomeAway = false;
            advanceState.needsOpponent = false;
            advanceState.game.Home = 'bye';
            teamAdvanced(data, message);
            return;
        }
        else {
            message.reply('Invalid option, please say \`home\`, \`away\`, or \`bye\`');
        }

        if (!advanceState.needsHomeAway) {
            // Successfully got home/away
            message.reply(`Thanks, now who is ${player.Name} playing this week?`);
        }
    } 
    else if (advanceState.needsOpponent) {
        advanceState.needsOpponent = false;
        advanceState.game.Opponent = message.content;
        teamAdvanced(data, message);
    }
}

const teamAdvanced = (data, message) => {
    const player = data.Players[advanceState.coachIndex];

    data.CurrentWeek.push( { Coach: player.Name, Home: advanceState.game.Home, Opponent: advanceState.game.Opponent });

    const nextIndex = advanceState.coachIndex += 1;

    if (data.Players.length == nextIndex) {
        advanceState.completed = true;
        message.reply('Week advanced!');
        return;
    }

    advanceState = {
        completed: false,
        coachIndex: nextIndex,
        needsHomeAway: true,
        needsOpponent: true,
        game: {}
    }

    const nextPlayer = data.Players[advanceState.coachIndex];

    message.reply(`Next up, coach ${nextPlayer.Name}. Are they \`home\`, \`away\`, or on a \`bye\`?`);
}

const advance = (data, message) => {
    console.log(`received advance request from ${message.author}`);
    data.CurrentWeek = [];

    advanceState = {
        completed: false,
        coachIndex: 0,
        needsHomeAway: true,
        needsOpponent: true,
        game: {}
    }

    const firstPlayer = data.Players[0];

    message.author.send(`First up, coach ${firstPlayer.Name}. Are they \`home\`, \`away\`, or on a \`bye\`?`);
}