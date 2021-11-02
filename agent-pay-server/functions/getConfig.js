/**
 * Returns config used in the PayClient.
 * NB: This is sensitive data and only used as a temporary method to pass this to the client.
 */
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

exports.handler = async function (context, event, callback) {

    console.log(`event: ${JSON.stringify(event, null, 4)}`);

    function sendResponse(data) {
        const response = new Twilio.Response();
        response.appendHeader("Access-Control-Allow-Origin", "*");
        response.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        response.appendHeader("Content-Type", "application/json");
        response.setBody(data);
        return response;
    }

    // 
    // This is the most critical part of your backend code, as you must identify the user and (possibly)
    // challenge them with some authentication scheme. To determine the identity, you might use:
    //    * A session datum consistently identifying one anonymous visitor,
    //    * A session key identifying a logged-in user
    //    * OAuth credentials identifying a logged-in user
    //    * A random username for all comers.
    //
    const getSyncToken = function (identity) {
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
        token.identity = identity;

        // Serialize the token to a JWT string and include it in a JSON response
        return token.toJwt();
    };


    const config = {
        functionsURL: 'https://' + context.DOMAIN_NAME, //context.FUNCTIONS_URL,     // The Twilio Functions URL where the call handlers are deployed 
        paymentConnector: context.PAY_CONNECTOR,         // The name of the Twilio Pay connector configured
        paySyncToken: getSyncToken(event.identity),

        // These are Merchant specific config, each Agent will use each time
        captureOrder: [
            "payment-card-number",
            "security-code",
            "expiration-date",
        ],
        currency: 'AUD',
        tokenType: 'reusable',
    };

    console.log(`Pay Connector: ${config.paymentConnector}`);

    callback(null, sendResponse(config));

};