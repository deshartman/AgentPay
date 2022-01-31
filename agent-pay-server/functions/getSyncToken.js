/**
 * @param {string} identity - The identity of the user
 * 
 * Returns Sync Token used in the PayClient.
 */
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

exports.handler = async function (context, event, callback) {

    const twilioResponse = new Twilio.Response();

    // CORS handler. Remove on Deployment
    twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
    twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    twilioResponse.appendHeader("Content-Type", "application/json");

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
        //{ identity: identity }
    );
    token.addGrant(syncGrant);
    token.identity = event.identity;

    if (token) {
        // Serialize the token to a JWT string and include it in a JSON response
        twilioResponse.setBody(token.toJwt());
        return callback(null, twilioResponse);
    } else {
        twilioResponse.setStatusCode(400);
        return callback(null, twilioResponse.setBody(`Error with getting Synd Token`));
    }

};