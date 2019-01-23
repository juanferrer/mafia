/* globals $ */

// Server sent events: https://www.w3schools.com/html/html5_serversentevents.asp

let gameID = "";
let isGM = false;
let languageCode = "en";
let refreshTime = 2000;

let debug = {
	dev: true,
};
debug.log = function (msg) {
	if (debug.dev) console.log(msg); //eslint-disable-line no-console
};

/**
 * Perform I18N in the whole page for the specified language code
 * @param {String} languageCode ISO 639-1 code https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 */
function doI18N(languageCode) {
	$.getJSON(`i18n/${languageCode.toLowerCase()}.json`, I18N => {
		for (let key in I18N) {
			$(`#${key}`).html(I18N[key]);
		}
	});
}

/**
 * Start or join a game with the given gameID
 * @param {String} gameID
 * @param {String} playerName
 */
function joinGame(gameID, playerName) {
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

/**
 * Main function. It deals with changes in the server DB
 */
function updateGameState(data, status) {
	debug.log("Data: " + data);
	debug.log("Status: " + status);

	// And request update again
	setTimeout(requestGameStateUpdate, refreshTime);
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

	if (data.split("|")[0] === "SUCCESS") {
		if (data.split("|")[1] === "PLAYER") {
			isGM = false;
		} else {
			isGM = true;
			gameID = data.split("|")[1];
		}
	}

	$("#game-id").html(gameID);

	if (isGM) {
		$("#start-button").css("display", "block");
	}

	$(".new-game-area").css("display", "none");
	$(".join-game-area").css("display", "none");
	$(".lobby-area").css("display", "flex");

	setTimeout(requestGameStateUpdate, refreshTime);
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

$("#close-button").click(() => {
	$(".button-area").css("display", "flex");
	$(".lobby-area").css("display", "none");
});

$("#new-game-button").click(() => {
	let playerName = $("input[name='new-game-player-name'").val();
	joinGame("", playerName);
});

$("#join-game-button").click(() => {
	gameID = $("input[name='join-game-id'").val();
	let playerName = $("input[name='join-game-player-name'").val();
	joinGame(gameID, playerName);
});

// Cache whatever language the user selected
