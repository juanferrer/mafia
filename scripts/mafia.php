<?php

header('Access-Control-Allow-Origin: juanferrer.github.io');
header('Access-Control-Allow-Origin: *');

define('DB_NAME', 'id2777537_mafia_db');
define('DB_USERNAME', 'id2777537_crazy_maniac');
define('DB_PASSWORD', '%h$4Cb1LlXhj');

define('SLEEP_TIME', 5);

//region Base logic

// Handle no parameters
if (!isset($_POST['type']) || $_POST['type'] == '') {
    http_response_code(400);
    die('MISSING PARAMETERS');
}

// TODO: Sanitise user input

$requestType = $_POST['type'];

switch (strtoupper($requestType)) {
    case 'JOIN':
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        $playerID = randomString(11);
        // Join the current game or create one if none exists
        joinGame($gameID, $playerID, $playerName);
        break;
    case 'LEAVE':
        // Leave the current game
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        leaveGame($gameID, $playerName);
        break;
    case 'REFRESH':
        // Get the updated game state
        $gameID = $_POST['gameID'];
        refreshGameState($gameID);
        break;
    case 'CHANGE':
        // Make changes to data
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        $varToChange = $_POST['varToChange'];
        $newValue = $_POST['newValue'];

        changeGameData($gameID, $variable, $newValue);
        break;
    default:
        http_response_code(400);
        break;
}

//endregion

//region Main functions

// Join the game with the specified ID or create a new one and return a new gameID
// gameID is a string of 3 alphanumeric caracters
function joinGame($gameID, $playerID, $playerName)
{
    $mysqli = new mysqli('localhost', DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    if (!$gameID) {
        // If $gameID empty, create new game
        $gameID = newGameID();

        // Check that there is no game already using this ID
        $result = $mysqli->query('SELECT gmID FROM games WHERE gameID = ' . $gameID);
        do {
            // Wait, there is a game already using this ID. Generate a new one and try again
            $result = $mysqli->query('SELECT gmID FROM games WHERE gameID = ' . $gameID);
        } while ($result);

        // First player in a game becomes the GM
        $playersData = json_encode(['players' => [['playerID' => $playerID, 'playerName' => $playerName]]]);
        $gameData = json_encode(['data' => '']);
        if ($result = $mysqli->query('INSERT INTO games VALUES (\'' . $gameID . '\', \'' . $playersData . '\', \'' . $gameData . '\', \'' . $playerID . '\')')) {
            // Now, send new gameID back to the host player
            exit($gameID);
        } else {
            http_response_code(500);
            die('GAME NOT CREATED');
        }

    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        $result = $mysqli->query('SELECT players FROM games WHERE gameID = \'' . $gameID . '\'');

        if ($result->num_rows <= 0) {
            // Wait, there is no game with that ID
            http_response_code(404);
            die('GAME NOT FOUND');
        }

        // There should be only one game with this ID, so join first one with matched ID
        $players = json_decode(($result->fetch_row())[0], true);
        $result->close();
        // Add this playerID to the players array, and insert back into the entry
        array_push($players['players'], ['playerID' => $playerID, 'playerName' => $playerName]);
        $playersData = json_encode($players);

        if ($result = $mysqli->query('UPDATE games SET players = \'' . $playersData . '\' WHERE gameID = \'' . $gameID . '\'')) {
            // Signal the client that the game is ready
            exit('PLAYER');
        } else {
            http_response_code(500);
            die('NOT JOINED GAME');
        }
    }

    // Now store the gameID in $_SESSION, so that we stay connected until the browser is closed
    $_SESSION['gameID'] = $gameID;
    $_SESSION['playerID'] = $playerID;
    $_SESSION['playerName'] = $playerName;
}

//
function leaveGame($gameID, $playerName)
{
    // If $gameID empty, ignore
    if ($gameID == "") {
        http_response_code(400);
        die("GAME ID MISSING");
    }
    // Otherwise, leave game
    $mysqli = new mysqli('localhost', DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    $result = $mysqli->query('SELECT players FROM games WHERE gameID = \'' . $gameID . '\'');

    if ($result->num_rows <= 0) {
        // Wait, there is no game with that ID
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    // There should be only one game with this ID, so join first one with matched ID
    $players = json_decode(($result->fetch_row())[0], true);
    $result->close();
    // Remove this playerID to the players array, and insert back into the entry
    $newPlayers = array_filter($players['players'], function ($v) {
        return $v['playerName'] != $playerName;
    });
    $playersData = json_encode($newPlayers);

    if ($result = $mysqli->query('UPDATE games SET players = \'' . $playersData . '\' WHERE gameID = \'' . $gameID . '\'')) {
        // Signal the client that the game is ready
        exit('DISCONNECTED');
    } else {
        http_response_code(500);
        die('UNABLE TO LEAVE GAME');
    }

    // Last player to leave the game also deletes the entry
    http_response_code(501);
    die('NOT IMPLEMENTED');
}

// Refresh
function refreshGameState($gameID)
{
    $mysqli = new mysqli('localhost', DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    $result = $mysqli->query('SELECT gameData, players FROM games WHERE gameID = \'' . $gameID . '\'');

    if ($result->num_rows <= 0) {
        // No data retrieved
        http_response_code(404);
        die('GAME NOT FOUND');
    }
    $data = $result->fetch_assoc();
    $result->close();

    exit($data);
}

function changeGameData($gameID, $variable, $value)
{

}

//endregion

//region Helper functions

function randomString($length = 3)
{
    $str = '';
    $characters = array_merge(range('A', 'Z'), range('a', 'z'), range('0', '9'));
    $max = count($characters) - 1;
    for ($i = 0; $i < $length; $i++) {
        $rand = mt_rand(0, $max);
        $str .= $characters[$rand];
    }
    return $str;
}

// Create a new 3 letter string to use as gameID
function newGameID()
{
    return randomString();
}

//endregion
