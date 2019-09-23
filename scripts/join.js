/* globals exports, require */
/// <reference path="..\\types\\firestore.d.ts" />

const Firestore = require("@google-cloud/firestore");
const PROJECTID = "mafia-253508";
const COLLECTION_NAME = "games";
const firestore = new Firestore({
    projectId: PROJECTID,
    timestampsInSnapshots: true,
});
const MISSING_PARAMETERS = "MISSING PARAMETERS";
const NOT_CREATED = "GAME NOT CREATED";
const NOT_FOUND = "GAME NOT FOUND";
const PLAYER = "PLAYER";
const NOT_JOINED = "NOT JOINED GAME";
const UNABLE_TO_CONNECT = "UNABLE TO CONNECT";

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.join = (req, res) => {
    let gameID = req.query.gameID;
    let playerName = req.query.playerName;

    if (playerName) {
        joinGame(gameID, playerName, res);
    } else {
        return res.status(400).send(MISSING_PARAMETERS);
    }
};

function joinGame(gameID, playerName, res) {
    let gameIDIsUnique = false;
    let games, playersData, gameData;
    // Make sure we managed to connect
    if (!firestore) {
        return res.status(500).send(UNABLE_TO_CONNECT);
    } else {
        games = firestore.collection(COLLECTION_NAME);
    }

    if (!gameID) {
        // Check that there is no game already using this ID
        do {
            gameIDIsUnique = true;
            // If gameID empty, create new game
            gameID = newGameID();
            // Check again, just to be sure
            let result = games.doc(gameID).get();
            // $result = $mysqli->query("SELECT COUNT(1) FROM games WHERE gameID = $gameID");

            return res.status(200).send(result);

            if (result) {
                gameIDIsUnique = false;
            }
        } while (!gameIDIsUnique);

        // First player in a game becomes the GM
        playersData = {
            "players": [playerName]
        };
        gameData = {
            "data": ""
        };

        // Set gameID, playersData, gameData, playerName, isPlaying and currentDate
        games.doc(gameID).set({
            "playersData": playersData,
            "gameData": gameData,
            "gmName": playerName,
            "isPlaying": false,
            "date": Date.now()
        }).then(() => {
            // If done, send the new gameID back to the host player
            return res.status(200).send(gameID);
        }).catch(() => {
            // If not, return an error
            return res.status(500).send(NOT_CREATED);
        });
    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        games.doc(gameID).get().then(doc => {
            if (doc.exists) {
                doc.get().then((docSnap) => {
                    // We have a snapshot of the document, get the players and add the new player
                    let temp = docSnap.get("playersData");
                    if (temp) {
                        playersData = JSON.parse(temp);
                        if (playersData.indexOf(playerName) < 0) {
                            playersData.push(playerName);
                        }
                    } else {
                        return res.status(404).send(NOT_FOUND);
                    }

                    // We've added the player, lets make the changes on the DB
                    doc.update(
                        { "playersData": playersData }
                    ).then(() => {
                        return res.status(200).send(PLAYER);
                    }).catch(() => {
                        return res.status(500).send(NOT_JOINED);
                    });

                });
            } else {
                return res.status(404).send(NOT_FOUND);
            }
        }).catch(() => {
            return res.status(404).send(NOT_FOUND);
        });
    }
}

/**
 * Get three random characters
 * @param {Number} length
 */
function randomString(length = 3) {
    let str = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        str += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return str;
}

// Create a new 3 letter string to use as gameID
function newGameID() {
    return randomString();
}
