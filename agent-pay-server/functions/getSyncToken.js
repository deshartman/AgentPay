/**
 * @param {string} identity - The identity of the user
 * 
 * Returns Sync Token used in the PayClient.
 */
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

exports.handler = async function (context, event, callback) {

    // CORS handler. Remove on Deployment
    const response = new Twilio.Response();
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json",
    };
    response.setHeaders(headers);

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

    // Serialize the token to a JWT string and include it in a JSON response
    callback(null, token.toJwt());

};