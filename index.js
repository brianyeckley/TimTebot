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

    console.log('command: ' + command);
    if (command === 'help') {
        let help = `\`!register Brian Colorado Buffaloes\``;
        help += "\n\`!list\`";
        help += "\n\`!result - 29-14\` (your score first)";
        help += "\n\`!advance\` and we'll have a chat";
        help += "\n\`!advanceweek\` and we'll move to the next week on the schedule";
        help += "\n\`!movebackweek\` and we'll move to the previous week on the schedule";
        help += "\n\`!status\`";
        help += "\n\`!schedule\` weekNumber or playerName";
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
        const currentGame = data.CurrentWeek.Games.find(game => game.Coach == player.Name);
        currentGame.Score = args[0];
        currentGame.Result = scores[0] > scores[1] ? 'W' : 'L';
        //for full season storage
        const currentWeek = data.Schedule.find(sched => sched.Week == data.CurrentWeek.Week);
        const scheduleGame = currentWeek.Games.find(game => game.Coach == player.Name);
        scheduleGame.Score = args[0];
        scheduleGame.Result = scores[0] > scores[1] ? 'W' : 'L';

        if (currentGame.Result === 'W') {
            message.reply('congratulations!');
        }
        else {
            message.reply('oof, sorry.');
        }
    }
    else if (command === 'advance') {
        advance(data, message);

        //outputGames(data, message);
    }
    else if (command === 'status') {
        outputGames(data, message);
    }
    else if (command == 'shutdown') {
        message.reply('BYE :middle_finger:').then(() => process.exit());
    }
    else if (command == 'advanceweek') {
        console.log('advancing to next week');
        advanceToNextWeek(data, message);
    }
    else if (command == 'movebackweek') {
        moveBackWeek(data, message);
    }
    else if (command == 'schedule') {
        parsedArg = parseInt(args[0]);
        if (parsedArg) {
            outputSchedule(data, message, args[0]);
        }
        else{
            outputScheduleForTeam(data, message, args[0]);
        }
    }
    else if (command == 'standings'){
        outputStandings(data, message);
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
    let statusBuffer = `**WEEK ${data.CurrentWeek.Week}**`
    unplayedGames = [];
    data.CurrentWeek.Games.forEach(game => {
        if (game.Home.toLowerCase() === 'bye') {
            statusBuffer += `\n${game.Coach} has a bye week.`;
        } else {
            const atOrVs = game.Home.toLowerCase() === 'home' ? 'vs' : 'at';

            if (game.Result) {
                statusBuffer +=`\n${game.Coach} ${atOrVs} ${game.Opponent} ${game.Result === 'W' ? ':regional_indicator_w:' : ':regional_indicator_l:'} (${game.Score})`;
            }
            else {
                unplayedGames.push(game);
                statusBuffer += `\n${game.Coach} ${atOrVs} ${game.Opponent} :eyes:`;
            }
        }
    });
    if (unplayedGames.length == 1){
        statusBuffer += `\nJust waiting on you, **${unplayedGames[0].Coach.toUpperCase()}**...`;
    }
    else if (unplayedGames.length == 0){
        statusBuffer += `\nEveryone's played this week. Ready to advance!`;
    }
    message.channel.send(statusBuffer);
}

const handleDM = (data, message) => {
    console.log(`received dm from ${message.author}`);
    console.log(advanceState);
    if (advanceState.completed) {
        message.reply('sup');
        return;
    }

    if (advanceState.needsWeek) {
        advanceState.week = parseInt(message.content);
        advanceState.needsWeek = false;
        const firstPlayer = data.Players[0];
        message.author.send(`First up, coach ${firstPlayer.Name}. Are they \`home\`, \`away\`, or on a \`bye\`?`);
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
    data.CurrentWeek.Games.push( { Coach: player.Name, Home: advanceState.game.Home, Opponent: advanceState.game.Opponent });

    const nextIndex = advanceState.coachIndex += 1;

    if (data.Players.length == nextIndex) {
        data.CurrentWeek.Week = advanceState.week;
        data.Schedule.push(data.CurrentWeek);
        advanceState.completed = true;
        message.reply('Week advanced!');
        return;
    }

    advanceState = {
        completed: false,
        coachIndex: nextIndex,
        needsHomeAway: true,
        needsOpponent: true,
        needsWeek: false,
        game: {},
        week: advanceState.week
    }

    const nextPlayer = data.Players[advanceState.coachIndex];

    message.reply(`Next up, coach ${nextPlayer.Name}. Are they \`home\`, \`away\`, or on a \`bye\`?`);
}

const advance = (data, message) => {
    console.log(`received advance request from ${message.author}`);
    const weekNumber = data.CurrentWeek.Week;
    data.CurrentWeek = {Week: weekNumber+1, Games: []};

    advanceState = {
        completed: false,
        coachIndex: 0,
        needsHomeAway: true,
        needsOpponent: true,
        needsWeek: true,
        week: 0,
        game: {}
    }

    message.author.send(`Ok what is the week number you want to enter the schedule for?`);
}

const outputSchedule = (data, message, weekNum) => {
    console.log(`received schedule request for week ${weekNum}`);
    week = data.Schedule.find(sched => sched.Week == weekNum);
    if (!week) {
        message.channel.send('The week was not found');
        return;
    }
    gamesToDisplay = week.Games;
    let scheduleBuffer = `**WEEK ${weekNum}**`;

    gamesToDisplay.forEach(game => {
        if (game.Home.toLowerCase() === 'bye') {
            scheduleBuffer += `\n${game.Coach} has a bye week.`;
        } else {
            const atOrVs = game.Home.toLowerCase() === 'home' ? 'vs' : 'at';

            if (game.Result) {
                scheduleBuffer += `\n${game.Coach} ${atOrVs} ${game.Opponent} ${game.Result === 'W' ? ':regional_indicator_w:' : ':regional_indicator_l:'} (${game.Score})`;
            }
            else {
                scheduleBuffer += `\n${game.Coach} ${atOrVs} ${game.Opponent} :eyes:`;
            }
        }
    });

    message.channel.send(scheduleBuffer);
}

const outputScheduleForTeam = (data, message, player) => {
    console.log(`received schedule request for player ${player}`);
    data.Schedule.sort((a,b) => a.Week - b.Week);
    gamesToDisplay = getScheduleForPlayer(data, player);

    gameWeek = data.Schedule[0].Week;
    if (gamesToDisplay.length == 0) {
        message.channel.send('No schedule was found for that player.');
        return;
    }
    let scheduleBuffer = `**${player}'s Schedule**`;

    gamesToDisplay.forEach(game => {
        if (game.Home.toLowerCase() === 'bye') {
            scheduleBuffer += `\nWK ${gameWeek}: ${game.Coach} has a bye week.`;
        } else {
            const atOrVs = game.Home.toLowerCase() === 'home' ? 'vs' : 'at';

            if (game.Result) {
                scheduleBuffer += `\nWK ${gameWeek}: ${game.Coach} ${atOrVs} ${game.Opponent} ${game.Result === 'W' ? ':regional_indicator_w:' : ':regional_indicator_l:'} (${game.Score})`;
            }
            else {
                scheduleBuffer += `\nWK ${gameWeek}: ${game.Coach} ${atOrVs} ${game.Opponent} :eyes:`;
            }
        }
        gameWeek++;
    });

    message.channel.send(scheduleBuffer);
}

const advanceToNextWeek = (data, message) => {
    const currentWeek = data.CurrentWeek.Week;
    const nextWeek = data.Schedule.find(sched => sched.Week == (currentWeek+1));
    if (!nextWeek) {
        message.channel.send('Sorry, no further week found. Please use !advance instead');
    }
    else{
        data.CurrentWeek = nextWeek;
        outputGames(data, message);
    }
}

const moveBackWeek = (data, message) => {
    const currentWeek = data.CurrentWeek.Week;
    const prevWeek = data.Schedule.find(sched => sched.Week == (currentWeek-1));
    if (!prevWeek) {
        message.channel.send('Sorry, no previous week found. Please use !advance instead');
    }
    else{
        data.CurrentWeek = prevWeek;
        outputGames(data, message);
    }
}

const getScheduleForPlayer = (data, player) => {
    gamesToReturn = []
    data.Schedule.forEach(week => {
        const playerGame = week.Games.find(game => game.Coach.toLowerCase() == player.toLowerCase());
        if (playerGame){
            gamesToReturn.push(playerGame);
        }
    })
    return gamesToReturn;
}

const outputStandings = (data, message) => {
    let standings = [];
    data.Players.forEach(player => {
        const playerGames = getScheduleForPlayer(data, player.Name);
        const wins = playerGames.filter(game => game.Result && game.Result == 'W');
        const losses = playerGames.filter(game => game.Result && game.Result == 'L');
        //const pointsFor;
        //const pointsAgainst
        standings.push( { 
            Name: player.Name, 
            Wins: wins ? wins.length : 0, 
            Losses: losses ? losses.length : 0
        });
    })
    standings.sort((a,b) => (b.Wins - a.Wins) || (a.Losses - b.Losses));
    let count = 1;
    let standingsBuffer = `**STANDINGS**`;
    standings.forEach(player => {
        standingsBuffer += `\n${count}. ${player.Name} ${player.Wins} - ${player.Losses}`;
        count++;
    })
    message.channel.send(standingsBuffer);
}