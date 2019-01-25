/* globals $ */

const Roles = Object.freeze({
	MAFIOSO: Symbol("mafioso"),
	INNOCENT: Symbol("innocent"),
});

let gameID = "";
let playerName = "";
let isGM = false;
let languageCode = "en";
let refreshTime = 2000;
let refreshTimeout;
let failedAttempts = 0;
let i18n = {};
let players = [];
let availableRoles = [{
	type: Roles.MAFIOSO,
	amount: 0
}, {
	type: Roles.INNOCENT,
	amount: 0
}];

let debug = {
	dev: true,
};
debug.log = function (msg) {
	if (debug.dev) console.log(msg); // eslint-disable-line no-console
};

debug.error = function (msg) {
	if (debug.dev) console.error(msg); // eslint-disable-line no-console
};

/**
 * Perform I18N in the whole page for the specified language code
 * @param {String} languageCode ISO 639-1 code https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 */
function doI18N(languageCode) {
	$.getJSON(`i18n/${languageCode.toLowerCase()}.json`, I18N => {
		// Cache whatever language the user selected
		i18n = I18N;
		for (let key in I18N) {
			$(`#${key}`).html(I18N[key]);
		}
	});
}

// #region API calls

/**
 * Start or join a game with the given gameID
 * @param {String} gameID
 * @param {String} playerName
 */
function joinGame(gameID, playerName) {

	// TODO: Validate playerName (only alphanumeric characters)

	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": gameID, "playerName": playerName, "type": "JOIN" },
		error: (request, status, error) => {
			debug.log("Request: " + request);
			debug.log("Status: " + status);
			debug.log("Error: " + error);
		},
		success: goToLobby
	});
}

function requestGameStateUpdate() {

	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": gameID, "type": "REFRESH" },
		error: (request, status, error) => {
			debug.log("Request: " + request);
			debug.log("Status: " + status);
			debug.log("Error: " + error);
		},
		success: updateGameState
	});
}

function leaveGame(gameID, playerName) {
	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": gameID, "playerName": playerName, "type": "LEAVE" },
		error: (request, status, error) => {
			debug.log("Request: " + request);
			debug.log("Status: " + status);
			debug.log("Error: " + error);
		},
		success: (data, status, request) => {
			debug.log("Data: " + data);
			debug.log("Status: " + status);
			debug.log("Request: " + request);

			gameID = "";
			playerName = "";
			isGM = false;
			failedAttempts = 0;
			clearTimeout(refreshTimeout);
			refreshTimeout = undefined;
		}
	});
}

function setGameActive(gameID, playerName, makeActive) {
	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": gameID, "playerName": playerName, "active": makeActive, "type": "SETACTIVE" },
		error: (request, status, error) => {
			debug.log("Request: " + request);
			debug.log("Status: " + status);
			debug.log("Error: " + error);
		},
		success: (data, status, request) => {
			debug.log("Data: " + data);
			debug.log("Status: " + status);
			debug.log("Request: " + request);
		}
	});
}

function changeGameData(gameID, playerName, gameData) {
	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": gameID, "playerName": playerName, "newData": gameData, "type": "CHANGE" },
		error: (request, status, error) => {
			debug.log("Request: " + request);
			debug.log("Status: " + status);
			debug.log("Error: " + error);
		},
		success: (data, status, request) => {
			debug.log("Data: " + data);
			debug.log("Status: " + status);
			debug.log("Request: " + request);
		}
	});
}
// #endregion

/**
 * Main function. It deals with changes in the server DB
 */
function updateGameState(data, status, request) {
	debug.log("Data: " + data);
	debug.log("Status: " + status);

	if (request.status === 200) {
		failedAttempts = 0;

		let json = JSON.parse(data);

		// let gameData = JSON.parse(json.gameData);
		let newPlayers = JSON.parse(json.players);
		let isPlaying = JSON.parse(json.isPlaying);

		// Now, do what is needed with the received data

		if ($("#lobby-area").css("display") !== "none") {
			// Lobby is visible, we should add the players as soon as we see them
			$("#players-list").html("");

			newPlayers.players.forEach(p => {
				$("#players-list").append(`<span>${p}</span>`);
			});

			players = newPlayers;

			if (isPlaying) {
				// Start the game
			}
		} else if ($("#gameplay-area").css("display") !== "none") {
			// We're playing, so update the game according to the new data
		}

		// And request update again
		refreshTimeout = setTimeout(requestGameStateUpdate, refreshTime);
	} else {
		if (failedAttempts < 3) {
			debug.log("Something went wrong. Retrying...");
			setTimeout(requestGameStateUpdate, refreshTime);
			failedAttempts++;
		} else {
			debug.error("Server not responding.");
		}
	}
}

/**
 *  Store the gameID, enter lobby and start a repeating update function (recursive timeout)
 * @param {String} data
 * @param {String} status
 * @param {String} request
 */
function goToLobby(data, status, request) {
	debug.log("Data: " + data);
	debug.log("Status: " + status);
	debug.log("Request: " + request);

	if (request.status === 200) {
		if (data === "PLAYER") {
			isGM = false;
		} else {
			isGM = true;
			gameID = data;
		}

		$("#game-id").html(gameID);

		if (isGM) {
			$("#start-button").css("display", "block");
			$(".settings").css("display", "flex");
		}

		$(".new-game-area").css("display", "none");
		$(".join-game-area").css("display", "none");
		$(".lobby-area").css("display", "flex");

		// And start update functionx
		requestGameStateUpdate();
	}
}

/**
 * Assign roles to each player and return a gameData object
 * @param {string[]} players
 * @returns {any} gameData
 */
function assignRoles(players) {
	let gameData = {
		roles: {}
	};

	players.forEach(p => {
		gameData.roles[p] = "";
	});

	return gameData;
}

/** Using function to have access to this */
$("#language-select").change(function () {
	languageCode = this.value;
	doI18N(languageCode);
});

$("#start-new-game-button").click(() => {
	$(".new-game-area").css("display", "flex");
	$(".button-area").css("display", "none");
});

$("#start-join-game-button").click(() => {
	$(".join-game-area").css("display", "flex");
	$(".button-area").css("display", "none");
});

$(".back-button").click(() => {
	$(".button-area").css("display", "flex");
	$(".new-game-area").css("display", "none");
	$(".join-game-area").css("display", "none");
});

$("#new-game-button").click(() => {
	playerName = $("input[name='new-game-player-name'").val();
	joinGame("", playerName);
});

$("#join-game-button").click(() => {
	gameID = $("input[name='join-game-id'").val();
	playerName = $("input[name='join-game-player-name'").val();
	joinGame(gameID, playerName);
});

$("#start-button").click(() => {
	let gameData = assignRoles(players);
	setGameActive(gameID, playerName, true);
	changeGameData(gameID, playerName, gameData);
	$(".lobby-area").css("display", "none");
});

$("#close-button").click(() => {
	$(".button-area").css("display", "flex");
	$(".lobby-area").css("display", "none");
	leaveGame(gameID, playerName);
});

window.addEventListener("beforeunload", () => {
	if ($("#gameplay-area").css("display") !== "none") {
		leaveGame(gameID, playerName);
	}
});
