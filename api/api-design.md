# REST API Design

`/api/{controller}/games/{id}`

## Endpoints
GET     /games/{id}     -> {Game} : Get info about specific game    REFRESH
POST    /games          -> {Game} : Create a new game               JOIN (first)
PUT     /games/{id}     -> {Game} : Update some info in the game    JOIN (non-first)/CHANGE/SETACTIVE/LEAVE (non-last)
DELETE  /games/{id}     -> {}     : Delete specific game            LEAVE (last)
