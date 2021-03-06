<?php

// Inform PHP that we're using UTF-8 strings
mb_internal_encoding('UTF-8');
mb_http_input('UTF-8');
mb_http_output('UTF-8');
mb_language('uni');

header('Access-Control-Allow-Origin: juanferrer.github.io');
header('Access-Control-Allow-Origin: juanferrer.dev');
header('Access-Control-Allow-Origin: *');

define('HOSTNAME', 'DB_HOST');
define('DB_NAME', 'DB_NAME');
define('DB_USERNAME', 'DB_USER');
define('DB_PASSWORD', 'DB_PASS');

define('SLEEP_TIME', 5);

//region Base logic

// Handle no parameters
if (!isset($_POST['type']) || $_POST['type'] === '') {
    http_response_code(400);
    die('MISSING PARAMETERS');
}

// TODO: Sanitise user input

$requestType = $_POST['type'];

switch (strtoupper($requestType)) {
    case 'JOIN':
        $gameID = escapeString($_POST['gameID']);
        $playerName = escapeString($_POST['playerName']);
        // Join the current game or create one if none exists
        joinGame($gameID, $playerName);
        break;
    case 'LEAVE':
        // Leave the current game
        $gameID = escapeString($_POST['gameID']);
        $playerName = escapeString($_POST['playerName']);
        //
        leaveGame($gameID, $playerName);
        break;
    case 'REFRESH':
        // Get the updated game state
        $gameID = escapeString($_POST['gameID']);
        //
        refreshGameState($gameID);
        break;
    case 'CHANGE':
        // Make changes to data
        $gameID = escapeString($_POST['gameID']);
        $playerName = escapeString($_POST['playerName']);
        $newData = escapeString($_POST['newData']);
        //
        changeGameData($gameID, $playerName, $newData);
        break;
    case 'SETACTIVE':
        $gameID = escapeString($_POST['gameID']);
        $playerName = escapeString($_POST['playerName']);
        $active = escapeString($_POST['active']);
        // Start/stop game and update date
        changeGameState($gameID, $playerName, $active);

    default:
        http_response_code(400);
        break;
}

//endregion

//region Main functions

// Join the game with the specified ID or create a new one and return a new gameID
// gameID is a string of 3 alphanumeric caracters
function joinGame($gameID, $playerName)
{
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    if (!$gameID) {

        // Check that there is no game already using this ID
        do {
            $gameIDIsUnique = true;
            // If $gameID empty, create new game
            $gameID = newGameID();
            // Count number of rows with $gameID
            $result = $mysqli->query("SELECT COUNT(1) FROM games WHERE gameID = '$gameID'");
            if ($result->fetch_row()[0] > 0) {
                // Wait, there is a game already using this ID. Try again
                $result->close();
                $gameIDIsUnique = false;
            }
        } while (!$gameIDIsUnique);

        // First player in a game becomes the GM
        $playersData = json_encode(['players' => [$playerName]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $gameData = json_encode(['data' => ''], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($result = $mysqli->query("INSERT INTO games VALUES ('$gameID', '$playersData', '$gameData', '$playerName', 0, NOW())")) {
            // Now, send new gameID back to the host player
            exit($gameID);
        } else {
            http_response_code(500);
            die('GAME NOT CREATED');
        }

    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        $result = $mysqli->query("SELECT players FROM games WHERE gameID = '$gameID'");

        if ($result->num_rows <= 0) {
            // Wait, there is no game with that ID
            http_response_code(404);
            die('GAME NOT FOUND');
        }

        // There should be only one game with this ID, so join first one with matched ID
        $players = json_decode(($result->fetch_row())[0], true);
        $result->close();
        // Add this player to the players array, and insert back into the entry
        array_push($players['players'], $playerName);
        $playersData = json_encode($players, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($result = $mysqli->query("UPDATE games SET players = '$playersData' WHERE gameID = '$gameID'")) {
            // Signal the client that the game is ready
            exit('PLAYER');
        } else {
            http_response_code(500);
            die('NOT JOINED GAME');
        }
    }

    // Now store the gameID in $_SESSION, so that we stay connected until the browser is closed
    $_SESSION['gameID'] = $gameID;
    $_SESSION['playerName'] = $playerName;
}

//
function leaveGame($gameID, $playerName)
{
    // If $gameID empty, ignore
    if ($gameID === '') {
        http_response_code(400);
        die('GAME ID MISSING');
    }
    // Otherwise, leave game
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    if (playerIsGM($gameID, $playerName)) {
        if ($result = $mysqli->query("UPDATE games SET isPlaying = 0 WHERE gameID = '$gameID'")) {
            // All good, keep going
        } else {
            http_response_code(500);
            die('UNABLE TO STOP GAME');
        }
    }

    $result = $mysqli->query("SELECT players FROM games WHERE gameID = '$gameID'");

    if ($result->num_rows <= 0) {
        // Wait, there is no game with that ID
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    // There should be only one game with this ID, so join first one with matched ID
    $data = $result->fetch_row()[0];
    $result->close();

    $players = json_decode($data, true)['players'];

    if (count($players) === 1) {
        // We are the last player in the game, remove the DB entry
        if ($result = $mysqli->query("DELETE FROM games WHERE gameID = '$gameID'")) {
            exit('DELETED');
        } else {
            http_response_code(500);
            die('UNABLE TO DELETE GAME');
        }
    }

    // Otherwise, remove this player to the players array, and insert back into the entry
    if (($key = array_search($playerName, $players)) !== false) {
        unset($players[$key]);
        $players = array_values($players);
    }

    $playersData = json_encode(['players' => $players], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($result = $mysqli->query("UPDATE games SET players = '$playersData' WHERE gameID = '$gameID'")) {
        // Signal the client that they have disconnected
        exit('DISCONNECTED');
    } else {
        http_response_code(500);
        die('UNABLE TO LEAVE GAME');
    }
}

// Refresh
function refreshGameState($gameID)
{
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    $result = $mysqli->query("SELECT gameData, players, isPlaying FROM games WHERE gameID = '$gameID'");

    if ($result->num_rows <= 0) {
        // No data retrieved
        http_response_code(404);
        die('GAME NOT FOUND');
    }
    $data = $result->fetch_assoc();
    $result->close();

    exit(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function changeGameData($gameID, $playerName, $newData)
{
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    if (playerIsGM($gameID, $playerName)) {
        $gameData = json_encode(['data' => $newData], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($result = $mysqli->query("UPDATE games SET gameData = '$gameData' WHERE gameID = '$gameID'")) {
            // Signal the client that the data has been updated
            exit();
        } else {
            http_response_code(500);
            die('UNABLE TO UPDATE');
        }
    } else {
        http_response_code(403);
        die('UNABLE TO UPDATE');
    }
}

function changeGameState($gameID, $playerName, $active)
{
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }
    if (playerIsGM($gameID, $playerName)) {
        if ($result = $mysqli->query("UPDATE games SET isPlaying = $active WHERE gameID = '$gameID'")) {
            // Signal the client that the state has been changed
            exit();
        } else {
            http_response_code(500);
            die('UNABLE TO UPDATE');
        }
    } else {
        http_response_code(403);
        die('UNABLE TO UPDATE');
    }
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

// Check if the player is the GM
function playerIsGM($gameID, $playerName)
{
    $mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

    if ($mysqli->connect_error) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }

    $result = $mysqli->query("SELECT gmName FROM games WHERE gameID = '$gameID'");

    if ($result->num_rows <= 0) {
        // Wait, there is no game with that ID
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    $data = $result->fetch_assoc();
    $result->close();

    $isGM = $data['gmName'] === $playerName;

    return $isGM;
}

// To avoid any code injection, we will escape:
// ' (single quote)
// " (double quote)
// \ (backslash)
// $ (dollar sign)
function escapeString($string)
{
    if (is_array($string)) {
        return $string;
    }

    return $escapedString = str_replace('$', '\\$', addslashes($string));
}

//endregion
