/* globals $ */

const API = "https://mafiaapi20220317212330.azurewebsites.net";

const Roles = Object.freeze({
    MAFIOSO: "MAFIOSO",
    INNOCENT: "INNOCENT",
    DETECTIVE: "DETECTIVE",
    DOCTOR: "DOCTOR",
    WITNESS: "WITNESS",
    JAILER: "JAILER",
    VIGILANTE: "VIGILANTE",
    GODFATHER: "GODFATHER",
    MEDIUM: "MEDIUM",
    BODYGUARD: "BODYGUARD",
    OUTSIDER: "OUTSIDER",
    CULTLEADER: "CULTLEADER",
    CUPID: "CUPID",
    SUICIDAL: "SUICIDAL",
    KILLER: "KILLER",
    WARVETERAN: "WARVETERAN",
    SNITCH: "SNITCH"
});

const Themes = Object.freeze({
    LIGHT: "theme-light",
    DARK: "theme-dark"
});

const GameAreaHeights = Object.freeze({
    BUTTON: "15%",
    NEWGAME: "35%",
    JOINGAME: "35%",
    LOBBY: "100%",
    GAMEPLAY: "100%"
});

const AnimationTimer = 600;

let game = {
    gameID: "",
    playerName: "",
    playerToken: "",
    isGM: false,
    players: [],
    gameData: {},
    playerRole: ""
}

const refreshTime = 2000;
let refreshTimeout;
let failedAttempts = 0;
let i18n = {};

let settings = {
    languageCode: "en",
    theme: Themes.DARK
};

// Every time a new translation is added, the name of the language needs to
// be added to this object in the following form:
// language-code: native-name
// (e.g. en: "English", es: "Español")
const languages = {
    en: "English",
    es: "Español",
    ru: "Русский",
};

let debug = {
    dev: true,
    log: msg => {
        if (debug.dev) console.log(msg); // eslint-disable-line no-console
    },
    error: msg => {
        if (debug.dev) console.error(msg); // eslint-disable-line no-console
    }
};

// #region Other functions

/**
 * Get the number of roles selected
 * @returns {Number}
 */
function calculateRoles() {
    let numberOfRoles = parseInt($("#mafioso-counter-display").attr("data-value"));

    if ($("#detective-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#doctor-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#witness-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#jailer-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#vigilante-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#godfather-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#medium-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#bodyguard-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#cultleader-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#snitch-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#cupid-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#killer-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#suicidal-role-checkbox").is(":checked")) ++numberOfRoles;
    if ($("#warveteran-role-checkbox").is(":checked")) ++numberOfRoles;

    debug.log(numberOfRoles);

    return numberOfRoles;
}

async function requestGameStateUpdate() {
    const url = `${API}/api/game/${game.gameID}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "playerName": game.playerName,
            "playerToken": game.playerToken
        }
    }).then(response => response.json())
        .then(game => updateGameState(game))
        .catch(error => console.error(`Error ${error}`));
}

/**
 * Get a random in between 0 and max
 * @param {Number} max
 * @returns {Number}
 */
function randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/** Populate the gameplay area with the appropriate role */
function populateGameplayArea(playerRole, isGM, players) {
    const lcRole = playerRole.toLowerCase();
    $("#role-title-label").html(i18n["role-title-label"]);
    $("#role-title").html(i18n[`${lcRole}-role-title`]);
    // TODO: Populate with the appropriate image
    $("#role-role-description").html(i18n[`${lcRole}-role-description`]);
    $("#role-description").html(i18n[`${lcRole}-role-description`]);
    // Get a random string from the flavour text array
    $("#role-flavour-text").html(i18n[`${lcRole}-role-flavour-text`][randomInt(i18n[`${lcRole}-role-flavour-text`].length)]);

    // For GM, add a player list
    if (isGM) {
        $("#players-list-gameplay-area").html("");
        players.forEach(p => {
            $("#players-list-gameplay-area").append(`<span onclick="showPlayerCard('${p.name}')">${p.name}</span>`);
        });
    }
}

/** Update the counter's display */
function updateCounters() {
    // Update each counter button
    $(".counter-button").each((index, counterButton) => {
        let display = $(`#${counterButton.getAttribute("data-display")}`);
        const number = parseInt(display.attr("data-value"));

        const rolesUnassigned = parseInt($("#innocent-counter-display").attr("data-value"));

        if (counterButton.classList.contains("counter-increment-button")) {
            if (rolesUnassigned <= 0) {
                counterButton.setAttribute("disabled", true);
            } else {
                counterButton.removeAttribute("disabled");
            }
        } else if (counterButton.classList.contains("counter-decrement-button")) {
            if (number <= 0) {
                counterButton.setAttribute("disabled", true);
            } else {
                counterButton.removeAttribute("disabled");
            }
        }
    });

    // Update each counter display
    $(".counter-display").each((index, display) => {
        display.innerHTML = $(display).attr("data-value");
    });
}

/**
 * Main function. It deals with changes in the server DB
 */
function updateGameState(data) {
    debug.log(data);

    //if (request.status === 200) {
    failedAttempts = 0;

    // let gameData = JSON.parse(json.gameData);
    game.gameData = data.data.gameData;
    const newPlayers = game.gameData.players;
    const isPlaying = game.gameData.isPlaying;

    // Now, do what is needed with the received data

    if ($("#lobby-area").css("display") !== "none") {
        // Lobby is visible, we should add the players as soon as we see them
        $("#players-list").html("");

        if (newPlayers) {
            game.players = newPlayers;
            game.players.forEach(p => {
                $("#players-list").append(`<span>${p.name}</span>`);
            });

            // Update the number of innocent players. Innocent display should
            // be the number of players that have no special role
            const unassignedRoles = game.players.length - calculateRoles() - 1;
            $("#innocent-counter-display").attr("data-value", unassignedRoles);
            updateCounters();

            if (unassignedRoles < 0) {
                $("#start-button").attr("disabled", true);
            } else {
                $("#start-button").removeAttr("disabled");
            }
        }


        if (isPlaying) {
            // First, get our role
            game.playerRole = game.gameData.roles[game.playerName];
            // Start the game
            populateGameplayArea(game.playerRole, game.isGM, game.players);
            // $(".lobby-area").css("display", "none");
            $(".lobby-area").css("height", "0");
            // $(".gameplay-area").css("display", "flex");
            setTimeout(() => { $(".gameplay-area").css("height", GameAreaHeights.GAMEPLAY); }, AnimationTimer);
            clearTimeout(refreshTimeout);
            refreshTimeout = undefined;
            return;
        }
    } else if ($(".gameplay-area").css("display") !== "none") {
        // We're playing, so update the game according to the new data
    }

    // And request update again
    refreshTimeout = setTimeout(requestGameStateUpdate, refreshTime);
    /*} else {
        if (failedAttempts < 3) {
            debug.log("Something went wrong. Retrying...");
            setTimeout(requestGameStateUpdate, refreshTime);
            failedAttempts++;
        } else {
            debug.error("Server not responding.");
        }
    }*/
}

/**
 *  Store the gameID, enter lobby and start a repeating update function (recursive timeout)
 * @param {String} gameCredentials
 */
function goToLobby(gameCredentials) {
    debug.log(gameCredentials);

    game.gameID = gameCredentials.data.id;
    if (gameCredentials.data.token !== undefined) {
        game.isGM = true;
        game.playerToken = gameCredentials.data.token;
    } else {
        game.isGM = false;
        game.playerToken = gameCredentials.data.gameData.players.filter(player => player.name == game.playerName)[0];
    }


    $("#game-id").html(game.gameID);

    if (game.isGM) {
        $("#start-button").css("display", "block");
        $(".settings").css("display", "flex");
    }

    // $(".new-game-area").css("display", "none");
    $(".new-game-area").css("height", "0");
    // $(".join-game-area").css("display", "none");
    $(".join-game-area").css("height", "0");
    // $(".lobby-area").css("display", "flex");
    setTimeout(() => { $(".lobby-area").css("height", GameAreaHeights.LOBBY); }, AnimationTimer);

    // And start update function
    requestGameStateUpdate();
}

/**
 * Shuffle array in place
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
    let j, x, i;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

/**
 * Perform I18N in the whole page for the specified language code
 * @param {String} languageCode [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
 */
function doI18N(languageCode) {
    if (!languageCode) languageCode = "en";
    $.getJSON(`i18n/${languageCode.toLowerCase()}.json`, I18N => {
        // Cache whatever language the user selected
        i18n = I18N;

        $("#title").html(i18n["title"]);
        $("#start-new-game-button").html(i18n["new-game-button"]);
        $("#start-join-game-button").html(i18n["join-game-button"]);
        $("#new-game-button").html(i18n["create-button"]);
        $("#new-game-back-button").html(i18n["back-button"]);
        $("#join-game-button").html(i18n["join-button"]);
        $("#join-game-back-button").html(i18n["back-button"]);
        $("#new-game-gameplay-button").html(i18n["new-game-button"]);
        $("#leave-gameplay-button").html(i18n["leave-button"]);
        $("#game-id-label").html(i18n["game-id-label"]);
        $("#mafioso-number-input-label").html(i18n["mafioso-number-input-label"]);
        $("#innocent-number-input-label").html(i18n["innocent-number-input-label"]);
        $("#start-button").html(i18n["start-button"]);
        $("#close-button").html(i18n["close-button"]);
        $("#role-title-label").html(i18n["role-title-label"]);
        $("#role-title-label-player-card").html(i18n["role-title-label-player-card"]);
        $("#close-player-card-button").html(i18n["close-button"]);
        $("#game-not-found-alert").html(i18n["game-not-found-alert"]);

        $("#new-game-player-name-input").attr("placeholder", i18n["name-placeholder-label"]);
        $("#join-game-id-input").attr("placeholder", i18n["game-id-placeholder-label"]);
        $("#join-game-player-name-input").attr("placeholder", i18n["name-placeholder-label"]);

        // This probably never happens. Need to check, maybe it can be removed
        if (game.playerRole) {
            const lcRole = game.playerRole.toLowerCase();
            // Populate the strings for the role too if one is assigned
            $("#role-role-description").html(i18n[`${lcRole}-role-description`]);
            $("#role-description").html(i18n[`${lcRole}-role-description`]);
        }
    });
}

/** Populate language-select with the available translations */
function populateLanguageSelect() {
    for (const lang in languages) {
        $("#language-select").append(`<option value="${lang}">${languages[lang]}</option>`);
    }
}

/**
 * Assign roles to each player and return a gameData object
 * @param {string[]} players
 * @param {string} playerName
 * @returns {any} gameData
 */
function assignRoles(players, playerName) {
    let gameData = {
        roles: {}
    };
    let rolesArray = [];

    // Assign mafiosi
    const mafiosoNumber = parseInt($("#mafioso-counter-display").attr("data-value"));
    for (let i = 0; i < mafiosoNumber; ++i) {
        rolesArray.push(Roles.MAFIOSO);
    }

    // Assign other roles
    if ($("#detective-role-checkbox").is(":checked")) rolesArray.push(Roles.DETECTIVE);
    if ($("#doctor-role-checkbox").is(":checked")) rolesArray.push(Roles.DOCTOR);
    if ($("#witness-role-checkbox").is(":checked")) rolesArray.push(Roles.WITNESS);
    if ($("#jailer-role-checkbox").is(":checked")) rolesArray.push(Roles.JAILER);
    if ($("#vigilante-role-checkbox").is(":checked")) rolesArray.push(Roles.VIGILANTE);
    if ($("#godfather-role-checkbox").is(":checked")) rolesArray.push(Roles.GODFATHER);
    if ($("#medium-role-checkbox").is(":checked")) rolesArray.push(Roles.MEDIUM);
    if ($("#bodyguard-role-checkbox").is(":checked")) rolesArray.push(Roles.BODYGUARD);
    if ($("#cultleader-role-checkbox").is(":checked")) rolesArray.push(Roles.CULTLEADER);
    if ($("#snitch-role-checkbox").is(":checked")) rolesArray.push(Roles.SNITCH);
    if ($("#cupid-role-checkbox").is(":checked")) rolesArray.push(Roles.CUPID);
    if ($("#killer-role-checkbox").is(":checked")) rolesArray.push(Roles.KILLER);
    if ($("#suicidal-role-checkbox").is(":checked")) rolesArray.push(Roles.SUICIDAL);
    if ($("#warveteran-role-checkbox").is(":checked")) rolesArray.push(Roles.WARVETERAN);

    // Everyone that is not another role, is innocent
    for (let i = 0, playersNumber = players.length - 1 - rolesArray.length; i < playersNumber; ++i) {
        rolesArray.push(Roles.INNOCENT);
    }

    rolesArray = shuffle(rolesArray);
    // Before assigning the roles, remove the GM from the players and give them
    // the role directly
    players.splice(players.indexOf(playerName), 1);
    gameData.roles[playerName] = "GM";

    // Now that we have "shuffled the cards", give a role to each player
    players.forEach((p, i) => {
        gameData.roles[p] = rolesArray[i];
    });

    return gameData;
}

/**
 * Add or substract a number from the specified counter
 * @param {HTMLElement} counterButton
 * @param {Number} modifier
 */
function modifyCounter(counterButton, modifier) {
    let display = $(`#${counterButton.getAttribute("data-display")}`);
    const number = parseInt(display.attr("data-value"));
    const totalRoles = game.players.length;
    let rolesAssigned = 0;
    $(".counter-display").toArray().forEach(v => {
        rolesAssigned += parseInt(v.getAttribute("data-value"));
    });

    if ((modifier > 0 && rolesAssigned < totalRoles) || (modifier < 0 && rolesAssigned >= 0)) {
        display.attr("data-value", number + modifier);
    }

    updateCounters();
}

/** Load the settings from local storage */
function loadSettings() {
    const jsonSettings = localStorage.getItem("mafiaSettings");
    try {
        if (jsonSettings) {
            settings = JSON.parse(jsonSettings);
        }
    } catch (e) {
        debug.log("String is not valid JSON");
        // No point storing it then
        localStorage.removeItem("mafiaSettings");
        // Use the current definition of settings (above)
    }
}

/** Store the settings for later use */
function updateSettings() {
    localStorage.setItem("mafiaSettings", JSON.stringify(settings));
}

/**
 * Change the theme of the app
 * @param {string} newTheme theme-light or theme-dark
 */
function changeTheme(newTheme) {
    if ($("body").hasClass(settings.theme)) {
        $("body").removeClass(settings.theme);
    }
    $("body").addClass(newTheme);
    settings.theme = newTheme;
    // Store new theme
    updateSettings();
}

/**
 * Populate the player card with player's info and show
 * @param {string} name
 */
// eslint-disable-next-line no-unused-vars
function showPlayerCard(name) {
    if (name) {
        const lcRole = game.gameData.roles[name].toLowerCase();
        $("#role-title-label-player-card").html(i18n["role-title-label-player-card"]);
        $("#role-title-player-card").html(i18n[`${lcRole}-role-title`]);
        $("#role-description-player-card").html(i18n[`${lcRole}-role-description`]);
        $(".player-id-card").css("visibility", "visible");
    }
}

/**
 * Reset the details from last game
 */
function resetGameDetails() {
    game.gameID = "";
    game.playerName = "";
    game.isGM = false;

    clearTimeout(refreshTimeout);
    refreshTimeout = undefined;
}

// #endregion

// #region API calls

/**
 * 
 * @param {String} playerName 
 */
async function createGame(playerName) {
    const url = `${API}/api/game`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "playerName": playerName,
        }
    }).then(response => response.json())
        .then(game => goToLobby(game))
        .catch(error => {
            console.error(`Error ${error}`)
            alert(i18n["game-not-found-alert"]);
        });
}

/**
 * Start or join a game with the given gameID
 * @param {String} gameID
 * @param {String} playerName
 */
async function joinGame(gameID, playerName) {
    const url = `${API}/api/game/${gameID}`;

    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "playerName": playerName,
            "playerToken": ""
        },
        body: {
            "op": "add",
            "path": "/gameData/players/-",
            "value": {
                "name": playerName
            }
        }
    }).then(response => response.json())
        .then(game => goToLobby(game))
        .catch(error => {
            console.error(`Error ${error}`)
            alert(i18n["game-not-found-alert"]);
        });
}

async function leaveGame(gameID, playerName, playerToken, gameData, isGM) {

    if (isGM) {
        deleteGame(gameID, playerName, playerToken)
    } else {

        const url = `${API}/api/game/${gameID}`;

        const playerIndex = gameData.players.indexOf(gameData.players.filter(player => player.name == playerName)[0]);

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "playerName": playerName,
                "playerToken": playerToken
            },
            body: {
                "op": "remove",
                "path": `/gameData/players/${playerIndex}`,
            }
        }).then(response => response.text())
            .then(game => resetGameDetails())
            .catch(error => {
                console.error(`Error ${error}`)
                alert(i18n["game-not-found-alert"]);
            });
    }
}

async function deleteGame(gameID, playerName, playerToken) {
    const url = `${API}/api/game/${gameID}`;

    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "playerName": playerName,
            "playerToken": playerToken
        },
    }).then(response => response.text())
        .then(game => resetGameDetails())
        .catch(error => {
            console.error(`Error ${error}`)
            alert(i18n["game-not-found-alert"]);
        });
}

async function setGameActive(gameID, playerName, playerToken, makeActive) {
    const url = `${API}/api/game/${gameID}`;

    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "playerName": playerName,
            "playerToken": playerToken
        },
        body: {
            "op": "replace",
            "path": `/isPlaying`,
            "value": makeActive
        }
    }).then(response => response.text())
        .then(data => {
            debug.log(data);
            //$(".lobby-area").css("display", "none");
            $(".lobby-area").css("height", "0");
            // $(".gameplay-area").css("display", "flex");
            setTimeout(() => { $(".gameplay-area").css("height", GameAreaHeights.GAMEPLAY); }, AnimationTimer);
            //clearTimeout(refreshTimeout);
            //refreshTimeout = undefined;    
        })
        .catch(error => {
            console.error(`Error ${error}`)
            alert(i18n["game-not-found-alert"]);
        });
}

async function changeGameData(gameID, playerName, playerToken, gameData) {
    const url = `${API}/api/game/${gameID}`;

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "playerName": playerName,
            "playerToken": playerToken
        },
        body: gameData
    }).then(response => response.text())
        .then(data => setGameActive(gameID, playerName, playerToken, true))
        .catch(error => {
            console.error(`Error ${error}`)
            alert(i18n["game-not-found-alert"]);
        });
}

// #endregion

// #region Event handlers

$("#theme-button").click(() => {
    changeTheme((settings.theme === Themes.DARK ? Themes.LIGHT : Themes.DARK));
});

/** Using function to have access to this */
$("#language-select").change(function () {
    settings.languageCode = this.value;
    updateSettings();
    doI18N(settings.languageCode);
});

$("#start-new-game-button").click(() => {
    // $(".new-game-area").css("display", "flex");
    setTimeout(() => { $(".new-game-area").css("height", GameAreaHeights.NEWGAME); }, AnimationTimer);
    // $(".button-area").css("display", "none");
    $(".button-area").css("height", "0");
});

$("#start-join-game-button").click(() => {
    // $(".join-game-area").css("display", "flex");
    setTimeout(() => { $(".join-game-area").css("height", GameAreaHeights.JOINGAME); }, AnimationTimer);
    // $(".button-area").css("display", "none");
    $(".button-area").css("height", "0");
});

$(".back-button").click(() => {
    // $(".button-area").css("display", "flex");
    setTimeout(() => { $(".button-area").css("height", GameAreaHeights.BUTTON); }, AnimationTimer);
    // $(".new-game-area").css("display", "none");
    $(".new-game-area").css("height", "0");
    // $(".join-game-area").css("display", "none");
    $(".join-game-area").css("height", "0");
});

$("#new-game-button").click(() => {
    game.playerName = $("input[name='new-game-player-name'").val();
    createGame(game.playerName);
});

$("#join-game-button").click(() => {
    game.gameID = $("input[name='join-game-id'").val();
    game.playerName = $("input[name='join-game-player-name'").val();
    joinGame(game.gameID, game.playerName);
});

$("#start-button").click(() => {
    game.gameData = assignRoles(game.players, game.playerName);
    changeGameData(game.gameID, game.playerName, game.gameData);
});

$("#close-button").click(() => {
    // $(".button-area").css("display", "flex");
    setTimeout(() => { $(".button-area").css("height", GameAreaHeights.BUTTON); }, AnimationTimer);
    // $(".lobby-area").css("display", "none");
    $(".lobby-area").css("height", "0");
    leaveGame(game.gameID, game.playerName, game.isGM);
});

$(".counter-increment-button").click((e) => {
    modifyCounter(e.currentTarget, 1);
});

$(".counter-decrement-button").click((e) => {
    modifyCounter(e.currentTarget, -1);
});

$("#close-player-card-button").click(() => {
    $(".player-id-card").css("visibility", "hidden");
});

$("#new-game-gameplay-button").click(() => {
    // $(".join-game-area").css("display", "flex");
    setTimeout(() => { $(".join-game-area").css("height", GameAreaHeights.JOINGAME); }, AnimationTimer);
    // $(".gameplay-area").css("display", "none");
    $(".gameplay-area").css("height", "0");
    requestGameStateUpdate();
});

$("#leave-gameplay-button").click(() => {
    // $(".button-area").css("display", "flex");
    setTimeout(() => { $(".button-area").css("height", GameAreaHeights.BUTTON); }, AnimationTimer);
    // $(".gameplay-area").css("display", "none");
    $(".gameplay-area").css("height", "0");
    leaveGame(game.gameID, game.playerName, game.gameData, game.isGM);
});

window.addEventListener("beforeunload", () => {
    leaveGame(game.gameID, game.playerName, game.gameData, game.isGM);
});

// #endregion


function main() {
    populateLanguageSelect();
    loadSettings();
    doI18N(settings.languageCode);
    changeTheme(settings.theme);
}

main();