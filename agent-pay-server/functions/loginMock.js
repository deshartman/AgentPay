/**
 * @param {string} username - The identity of the user
 * @param {string} password - The password of the user
 * 
 * Returns uses API key Secret to create a Sync Token used by the Client as a bearer token
 * Writes the token to Sync with username as the identity
 */
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;
var password = "AAPP@55w0rd!";      // Temp hack for username/password

exports.handler = async function (context, event, callback) {

    // CORS handler. Remove on Deployment
    function sendResponse(data) {
        const response = new Twilio.Response();
        response.appendHeader("Access-Control-Allow-Origin", "*");
        response.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        response.appendHeader("Content-Type", "application/json");
        response.setBody(data);
        return response;
    }

    var authheader = event.request.headers.authorization;
    console.log(event.request.headers);


    // Confirm the password from the request
    if (event.password === password) {

        // Create a "grant" identifying the Sync service instance for this app.
        var syncGrant = new SyncGrant({
            serviceSid: context.PAY_SYNC_SERVICE_SID,
        });

        // Create an access token which we will sign and return to the client,
        // containing the grant we just created and specifying his identity.
        var token = new AccessToken(
            context.ACCOUNT_SID,
            context.API_KEY,
            context.API_SECRET,
        );
        token.addGrant(syncGrant);
        token.identity = event.username;

        // Serialize the token to a JWT string and include it in a JSON response
        callback(null, sendResponse(token.toJwt()));

    };
};