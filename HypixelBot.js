const mc = require('minecraft-protocol');
const fs = require('fs');

const leader = {
	username: 'yourEmail@gmail.com',
	password: 'yourPassword'
};

const playCommand = '/play solo_insane';
const connectedList = [];
const botsList = [];
const accounts = fs
	.readFileSync('./accounts.txt', 'utf8')
	.split('\n')
	.slice(11)
	.map(acc => {
		const [username, password] = acc.split(':');
		return { username, password };
	});

let botsInParty = 0;
let gamesWon = 0;
let coinsWon = 0;

function createBot(account, isTimeout) {
	const { username, password } = account;
	if (connectedList.includes(username)) return;

	const timeout = setTimeout(() => createBot(account, true), 11000);
	console.log(`${username} queued to ${isTimeout ? 're-' : ''}connect to mc.hypixel.net.`);
	const bot = mc.createClient({
		host: 'mc.hypixel.net',
		port: 25565,
		username,
		password,
		version: '1.8.9'
	});

	const displayName = (bot.displayName = bot.username);

	bot.on('state', newState => {
		if (newState === mc.states.PLAY) {
			botsList.push(bot);
			console.log(`${displayName} successfully connected to mc.hypixel.net (${botsList.length}/${accounts.length}).`);
			connectedList.push(username);
			clearTimeout(timeout);
			checkConnected();
		}
	});

	bot.acceptParty = () => {
		setTimeout(() => {
			bot.write('chat', {
				message: `/party accept ${leader.username}`
			});
			console.log(`${displayName} has joined ${leader.username}'s party!`);
			botsInParty++;
			checkParty();
		}, 500);
	};

	bot.leaveGame = () => {
		setTimeout(() => {
			bot.write('chat', {
				message: `/l`
			});
			setTimeout(() => {
				bot.write('chat', {
					message: `/l`
				});
			}, 100);
		}, 100);
	};

	bot.on('end', () => {});
	bot.on('error', () => {});
	bot.on('close', () => {});
	bot.on('timeout', () => {});
	bot.on('disconnect', () => {});
	bot.on('kick_disconnect', () => {});
}

function createLeaderBot() {
	const timeout = setTimeout(createLeaderBot, 11000);

	const leaderBot = mc.createClient({
		host: 'hypixel.net',
		port: 25565,
		username: leader.username,
		password: leader.password,
		version: '1.8.9'
	});

	console.log(`Leader bot (${leaderBot.username}) is queued to connect to mc.hypixel.net.`);

	leaderBot.on('state', newState => {
		if (newState === mc.states.PLAY) {
			clearTimeout(timeout);
			console.log(`Leader bot ${leaderBot.username} connected to mc.hypixel.net. Connecting slave bots now.`);
			let i = 0;
			for (const account of accounts) {
				setTimeout(() => createBot(account), 12500 * i);
				i++;
			}
		}
	});

	leaderBot.on('packet', ({ message }, { state, name }) => {
		if (state !== mc.states.PLAY) return;
		if (name != 'chat') return;

		const data = JSON.parse(message);
		const extra = data.extra;
		if (!extra) return;

		let msg = '';
		for (const set of extra) {
			if (!set.text) continue;
			msg += set.text;
		}
		let coinMatch = msg.match(/\+(.+) coins!/);
		if (coinMatch) {
			gamesWon++;
			coinsWon += coinMatch[1] >>> 0;
			console.log(`Won a total of ${gamesWon} games, gaining you ${coinsWon} coins!`);
		}
	});
}

createLeaderBot();

function checkConnected() {
	if (botsList.length == accounts.length) {
		console.log('All bots connected! Ready to add to party now.');
		let i = 0;
		for (const bot of botsList) {
			// Add bots to the party
			setTimeout(() => {
				leaderBot.write('chat', {
					message: `/party ${bot.displayName}`
				});
				setTimeout(bot.acceptParty, 1000);
			}, 1000 * i);
			i++;
		}
	}
}

function checkParty() {
	if (botsInParty == accounts.length) {
		console.log('All bots in party! Ready to start game loop.');
		gameLoop();
	}
}

function gameLoop() {
	setTimeout(() => {
		leaderBot.write('chat', {
			message: playCommand
		});

		setTimeout(() => {
			for (const bot of botsList) {
				bot.leaveGame();
			}
			gameLoop();
		}, 18000);
	}, 1000);
}
