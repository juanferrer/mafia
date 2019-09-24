/* globals require, exports */

const https = require("https");
const SERVER = "https://php-server.byethost9.com/mafia.php";

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.makeRequest = (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    /*const data = JSON.stringify({
        "type": req.query.type || "",
        "gameID": req.query.gameID || "",
        "playerName": req.query.playerName || "",
        "active": req.query.active || 0
    });

    const options = {
        hostname: SERVER,
        port: 80,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": data.length
        }
    };

    const serverReq = https.request(options, serverRes => {
        serverRes.on("end", d => {
            return res.status(200).send(d);
        });
    });
    serverReq.write(data);
    serverReq.end();
    //return res.status(400).send(MISSING_PARAMETERS);*/
    res.redirect(SERVER);
};
