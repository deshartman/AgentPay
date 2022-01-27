/**
 * @param {string} username - The identity of the user
 * @param {string} password - The password of the user
 * 
 * Returns uses API key Secret to create a Sync Token used by the Client as a bearer token
 * Writes the token to Sync with username as the identity
 */
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

exports.handler = async function (context, event, callback) {

    // Prepare a new Twilio response for the incoming request
    const twilioResponse = new Twilio.Response();
    // Add CORS handling headers
    twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
    twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    twilioResponse.appendHeader("Content-Type", "application/json");
    console.log(event.request.headers);

    var authHeader = event.request.headers.authorization;

    // Reject requests that don't have an Authorization header
    if (!authHeader) return callback(null, setUnauthorized(twilioResponse));

    // The auth type and credentials are separated by a space, split them
    const [authType, credentials] = authHeader.split(' ');
    // If the auth type doesn't match Basic, reject the request
    if (authType.toLowerCase() !== 'basic')
        return callback(null, setUnauthorized(twilioResponse));

    // The credentials are a base64 encoded string of 'username:password',
    // decode and split them back into the username and password
    const [username, password] = Buffer.from(credentials, 'base64')
        .toString()
        .split(':');
    // If the password doesn't match the AUTH_TOKEN, reject
    if (password !== context.AUTH_TOKEN) {
        return callback(null, setUnauthorized(twilioResponse));
    }

    // If we've made it this far, the request is authorized!
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
    token.identity = username;

    // Serialize the token to a JWT string and include it in a JSON response
    twilioResponse.setBody(token.toJwt());
    callback(null, twilioResponse);

};

// Helper method to format the response as a 401 Unauthorized response
// with the appropriate headers and values
const setUnauthorized = (twilioResponse, body = 'Unauthorized') => {
    twilioResponse
        .setBody(body)
        .setStatusCode(401)
        .appendHeader(
            'WWW-Authenticate',
            'Basic realm="Authentication Required"',
        );

    return twilioResponse;
};