/**
 * This Function mocks what would normally be the Merchant server call to get a Pay token.
 * The merchant server would make a call to Twilio to get a Pay token, which does not yet
 * exist, so we will simulate it here.
 * 
 * https://www.twilio.com/docs/taskrouter/js-sdk/workspace/constructing-jwts
 * 
 * Merchant calls this service with the following parameters:
 * - Account SID
 * - API Key
 * - API Secret
 * - User Identity
 * - Pay Connector SID
 * 
 * We return a JWT token which is then used on all Agent calls. The final version of the SDK will 
 * use TwilSoc directly, rather than Sync to update. We will thus mock this on the agent side
 * by passing a fake Pay JWT token back.
 * 
 * NB: This is sensitive data and only used as a temporary method to pass this to the client.
 */

const JWT = require('jwt-simple');

exports.handler = async function (context, event, callback) {

    // Get data from the event & generate JWT token
    var payload = {
        "region": "",
        "jti": event.twilioApiKey + Date.now().toString(),
        "iss": event.twilioApiKey,
        "sub": event.twilioAccountSid,
        "iat": Date.now(),
        "exp": Date.now() + event.ttl,
        "grants": {
            "identity": event.identity,
            "pay": {
                "service_sid": event.payConnectorSid,
            },
        }
    };

    try {
        // Return JWT
        callback(null, JWT.encode(payload, event.twilioApiSecret, 'HS256', { header: { "cty": "twilio-fpa;v=1" } }));
    } catch (error) {
        callback(error, null);
    }
};




