<?php

header('Access-Control-Allow-Origin: juanferrer.github.io');
header('Access-Control-Allow-Origin: *');

define('DB_NAME', 'id2777537_mafia_db');
define('DB_USERNAME', 'id2777537_crazy_maniac');
define('DB_PASSWORD', '%h$4Cb1LlXhj');

//region Base logic

$gameID = $_POST['gameID'];
$playerID = $_POST['playerID'];
$requestType = $_POST['type'];

switch (strtoupper($requestType)) {
    case 'JOIN':
        joinGame($gameID, $playerID);
        break;
    case 'LEAVE':
        leaveGame($gameID, $playerID);
        break;
    case 'REFRESH':
        refreshGameState($gameID);
        break;
    case 'CHANGE':
        changeGM($gameID, $playerID);
        break;
    default:
        http_response_code(400);
        break;
}

//endregion

//region Main functions

// Join the game with the specified ID or create a new one and return a new gameID
// gameID is a string of 3 alphanumeric caracters
function joinGame($gameID, $playerID)
{
    $mysqli = new mysqli('localhost', DB_USERNAME, DB_PASSWORD, DB_NAME);
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
        $playersData = json_encode(['players' => array($playerID)]);
        $gameData = json_encode(['data' => '']);
        $result = $mysqli->query('INSERT INTO games VALUES (' . $gameID . ', ' . $playersData . ', ' . $gameData . ', ' . $playerID . ')');

        // Now, send new gameID back to the player
        echo 'SUCCESS|' . $gameID;
    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        $result = $mysqli->query('SELECT players FROM games WHERE gameID = ' . $gameID);

        if (!$result) {
            // Wait, there is no game with such ID
            echo 'ERROR|GAME NOT FOUND';
        }

        // Add this playerID to the players array, and insert back into the entry
        $players = json_decode($result, true);
        array_push($players['players'], $playerID);
        $playersData = json_encode($players);
        $result = $mysqli->query('INSERT INTO games (players) VALUE ' . $playersData . ' WHERE gameID = ' . $gameID);

        // Signal the client that the game is ready
        echo 'SUCCESS|' . $gameID;
    }
}

//
function leaveGame($gameID, $playerID)
{
    // If $gameID empty, ignore

    // Otherwise, leave game
    // Last player to leave the game also deletes the entry
    echo 'ERROR|NOT IMPLEMENTED';
}

// Refresh
function refreshGameState($gameID)
{
    echo 'ERROR|NOT IMPLEMENTED';
}

function changeGM($gameID, $playerID)
{
    echo 'ERROR|NOT IMPLEMENTED';
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
