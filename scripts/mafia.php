<?php
//ini_set('display_errors', 1);
require_once 'private.php';

// Inform PHP that we're using UTF-8 strings
mb_internal_encoding('UTF-8');
mb_language('uni');

require_once 'cors.php';

// Server-side analytics

define('SLEEP_TIME', 5);

//region Base logic
$contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
if ($contentType === 'application/json') {
    $content = trim(file_get_contents('php://input'));
    $decoded = json_decode($content, true);

    if (!is_array($decoded)) {

    } else {

    }
}

// Handle no parameters
if (!isset($_POST['type']) || $_POST['type'] === '') {
    http_response_code(400);
    die('MISSING PARAMETERS');
}

// Prepare request info
$requestType = $_POST['type'];

// $sessionId = session_id();
// $timestamp = $_SERVER['REQUEST_TIME'];
// $url = $_SERVER['REQUEST_URI'];
// $host = "";
// $path = [];
// $referrer = $_SERVER['HTTP_REFERER'];
// $osFamily = "";
// $osVersion = "";

// // Extract location from IP
// $location = json_decode(file_get_contents("https://geoplugin.net/json.gp?ip=" . $_SERVER['REMOVE_ADDR']));
// $countryISOCode = $location['geoplugin_countryCode'];
// $subdivisionsISOCode = $location['geoplugin_regionCode'];
// $cityName = $location['geoplugin_city'];
// $language = "";

switch (strtoupper($requestType)) {
    case 'JOIN':
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        // Join the current game or create one if none exists
        joinGame($gameID, $playerName);
        break;
    case 'LEAVE':
        // Leave the current game
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        //
        leaveGame($gameID, $playerName);
        break;
    case 'REFRESH':
        // Get the updated game state
        $gameID = $_POST['gameID'];
        //
        refreshGameState($gameID);
        break;
    case 'CHANGE':
        // Make changes to data
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        $newData = $_POST['newData'];
        //
        changeGameData($gameID, $playerName, $newData);
        break;
    case 'SETACTIVE':
        $gameID = $_POST['gameID'];
        $playerName = $_POST['playerName'];
        $active = $_POST['active'];
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
    $dbh = connectToDatabase();

    if (!$gameID) {

        // Check that there is no game already using this ID
        $gameIDIsUnique = true;
        // If $gameID empty, create new game
        $gameID = newGameID();
        // Count number of rows with $gameID
        $stmt = $dbh->prepare('SELECT COUNT(1) FROM games WHERE gameID = ?');
        do {
            $stmt->execute([$gameID]);
            $result = $stmt->fetch(PDO::FETCH_NUM);
            if ($result[0] > 0) {
                // Wait, there is a game already using this ID. Try again
                $gameIDIsUnique = false;
            }
        } while (!$gameIDIsUnique);

        // First player in a game becomes the GM
        $playersData = json_encode([$playerName]);
        $gameData = json_encode(new stdClass);
        $stmt = $dbh->prepare("INSERT INTO games VALUES (?, ?, ?, ?, 0, NOW())");
        if ($stmt->execute([$gameID, $playersData, $gameData, $playerName])) {
            // Now, send new gameID back to the host player
            exit($gameID);
        } else {
            http_response_code(500);
            die('GAME NOT CREATED');
        }
    } else {
        // Otherwise, join game with passed gameID
        // Get whatever players are now in the database
        $stmt = $dbh->prepare('SELECT players FROM games WHERE gameID = ?');
        $stmt->execute([$gameID]);
        $result = $stmt->fetch(PDO::FETCH_NUM);
        if (count($result) <= 0) {
            // Wait, there is no game with that ID
            http_response_code(404);
            die('GAME NOT FOUND');
        }

        // There should be only one game with this ID, so join first one with matched ID
        $players = json_decode($result[0], true);
        // Add this player to the players array, and insert back into the entry
        array_push($players, $playerName);
        $playersData = json_encode($players);

        $stmt = $dbh->prepare('UPDATE games SET players = ? WHERE gameID = ?');

        if ($stmt->execute([$playersData, $gameID])) {
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

// Leave the game with the specified ID or delete it if called by the last player
function leaveGame($gameID, $playerName)
{
    // If $gameID empty, ignore
    if ($gameID === '') {
        http_response_code(400);
        die('GAME ID MISSING');
    }
    // Otherwise, leave game

    $dbh = connectToDatabase();

    if (playerIsGM($gameID, $playerName)) {
        $stmt = $dbh->prepare('UPDATE games SET isPlaying = 0 WHERE gameID = ?');
        if ($stmt->execute([$gameID])) {
            // All good, keep going
        } else {
            http_response_code(500);
            die('UNABLE TO STOP GAME');
        }
    }

    $stmt = $dbh->prepare('SELECT players FROM games WHERE gameID = ?');
    $stmt->execute([$gameID]);
    $result = $stmt->fetch(PDO::FETCH_NUM);

    if (count($result) <= 0) {
        // Wait, there is no game with that ID
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    // There should be only one game with this ID, so join first one with matched ID
    $data = $result[0];
    $players = json_decode($data, true);

    if (count($players) === 1) {
        // We are the last player in the game, remove the DB entry
        $stmt = $dbh->prepare('DELETE FROM games WHERE gameID = ?');
        if ($stmt->execute([$gameID])) {
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

    $playersData = json_encode($players);

    $stmt = $dbh->prepare('UPDATE games SET players = ? WHERE gameID = ?');
    if ($stmt->execute([$playersData, $gameID])) {
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
    $dbh = connectToDatabase();

    $stmt = $dbh->prepare('SELECT gameData, players, isPlaying FROM games WHERE gameID = ?');
    $stmt->execute([$gameID]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    if (count($result) <= 0) {
        // No data retrieved
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    exit(json_encode(array('gameData'=>json_decode($result['gameData']),
                           'players'=>json_decode($result['players']),
                           'isPlaying'=>json_decode($result['isPlaying']))));
}

function changeGameData($gameID, $playerName, $newData)
{
    $dbh = connectToDatabase();

    if (playerIsGM($gameID, $playerName)) {

        $gameData = json_encode($newData);
        $stmt = $dbh->prepare('UPDATE games SET gameData = ? WHERE gameID = ?');
        if ($stmt->execute([$gameData, $gameID])) {
            // Signal the client that the data has been updated
            exit("CHANGED DATA");
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
    $dbh = connectToDatabase();

    if (playerIsGM($gameID, $playerName)) {
        $stmt = $dbh->prepare('UPDATE games SET isPlaying = ? WHERE gameID = ?');
        if ($stmt->execute([$active, $gameID])) {
            // Signal the client that the state has been changed
            exit("CHANGED STATE");
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

function isJSON($string)
{
    return (is_null(json_decode($string))) ? false : true;
}

function connectToDatabase()
{
    $dsn = 'mysql:host=' . HOSTNAME . ';dbname=' . DB_NAME . ';charset=utf8;';

    try {
        $dbh = new PDO($dsn, DB_USERNAME, DB_PASSWORD);
        $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $dbh;
    } catch (PDOException $e) {
        // Unable to connect to DB
        http_response_code(500);
        die('UNABLE TO CONNECT');
    }
}

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
    $dbh = connectToDatabase();
    $stmt = $dbh->prepare('SELECT gmName FROM games WHERE gameID = ?');
    $stmt->execute([$gameID]);
    $result = $stmt->fetch(PDO::FETCH_NUM);

    if (count($result) <= 0) {
        // Wait, there is no game with that ID
        http_response_code(404);
        die('GAME NOT FOUND');
    }

    $isGM = $result[0] === $playerName;

    return $isGM;
}

//endregion
