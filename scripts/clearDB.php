<?php
require_once 'private.php';

// Inform PHP that we're using UTF-8 strings
mb_internal_encoding('UTF-8');
mb_language('uni');

require_once 'cors.php';

// Connect to DB
$mysqli = new mysqli(HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_NAME);

if ($mysqli->connect_error) {
    // Unable to connect to DB
    error_log(date('Y m d H:i:s') . ' CLEARDB: [ERROR] Unable to connect to DB', 3, LOG_FILE);
}

// Delete after 7 days
$result = $mysqli->query('DELETE FROM games WHERE gameDate < NOW() - INTERVAL 7 DAY');

if ($result) {
    error_log(date('Y m d H:i:s') . 'CLEARDB: games cleared successfully', 3, LOG_FILE);
} else {
    error_log(date('Y m d H:i:s') . 'CLEARDB: [ERROR] Unable to clear DB', 3, LOG_FILE);
}
