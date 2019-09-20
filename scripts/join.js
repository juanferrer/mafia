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
        res.status(400).send(MISSING_PARAMETERS);
    }
};

function joinGame(gameID, playerName, res) {
    let gameIDIsUnique = false;
    let games;
    // Make sure we managed to connect
    if (!firestore) {
        res.status(500).send(UNABLE_TO_CONNECT);
        return;
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
            let result = games.doc(gameID);
            // $result = $mysqli->query("SELECT COUNT(1) FROM games WHERE gameID = $gameID");
            if (result) {
                gameIDIsUnique = false;
            }
        } while (!gameIDIsUnique);

        // First player in a game becomes the GM
        let playersData = {
            "players": [playerName]
        };
        let gameData = {
            "data": ""
        };

        // Set gameID, playersData, gameData, playerName, isPlaying and currentDate
        games.set({
            playersData: playersData,
            gameData: gameData,
            gmName: playerName,
            isPlaying: false,
            date: Date.now()
        }).then(() => {
            // If done, send the new gameID back to the host player
            res.status(200).send(gameID);
        }).catch(() => {
            // If not, return an error
            res.status(500).send(NOT_CREATED);
        });
    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        playersData = games.doc(gameID).get().then(doc => {
            if (doc.exists) {

            }
        })

        // $result = $mysqli->query("SELECT players FROM games WHERE gameID = '$gameID'");
        if (true) {
            // Wait, there is no game with that ID
            res.status(404).send(NOT_FOUND);
        }

        // There should be only one game with this ID, so join first one with matched ID
        // $players = json_decode(($result->fetch_row())[0], true);
        // $result->close();
        // Add this player to the players array, and insert back into the entry

        /*if ($result = $mysqli->query("UPDATE games SET players = '$playersData' WHERE gameID = '$gameID'")) {
          // Signal the client that the game is ready
          res.status(200).send(PLAYER);
        } else {
          http_response_code(500);
          res.status(500).send(NOT_JOINED);
        } /**/
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
