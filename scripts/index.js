/* globals $ */

// Server sent events: https://www.w3schools.com/html/html5_serversentevents.asp

let gameID = "";

let debug = {};
debug.log = function (msg) {
	console.log(msg); //eslint-disable-line no-console
};

function doI18N(languageCode) {
	$.getJSON(`i18n/${languageCode.toLowerCase()}.json`, I18N => {
		for (let key in I18N) {
			$(`#${key}`).html(I18N[key]);
		}
	});
}

/**
 * Generate a random string of the specified length
 * @param {Number} length
 * @returns {String}
 */
function randomString(length = 11) {
	let str = "";
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; ++i) {
		str += chars[Math.floor(Math.random() * chars.length)];
	}
	return str;
}


function newGame(playerName) {
	$.ajax("https://diabolic-straps.000webhostapp.com/mafia.php", {
		type: "POST",
		data: { "gameID": "", "playerName": playerName, "type": "JOIN" },
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

function joinGame() {

}

/** Using function to have access to this */
$("#language-select").change(function () {
	doI18N(this.value);
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
	let playerName = $("input[name='new-game-player-name'").val();
	newGame(playerName);
});

$("#join-game-button").click(() => {
	joinGame();
});

// Cache whatever language the user selected
