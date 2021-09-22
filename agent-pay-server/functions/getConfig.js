/**
 * Returns config used in the PayClient.
 * NB: This is sensitive data and only used as a temporary method to pass this to the client.
 */

exports.handler = async function (context, event, callback) {

    const config = {
        twilioAccountSid: context.ACCOUNT_SID,
        twilioApiKey: context.API_KEY,
        twilioApiSecret: context.API_SECRET,
        functionsURL: 'https://' + context.DOMAIN_NAME, //context.FUNCTIONS_URL,     // The Twilio Functions URL where the call handlers are deployed 
        payConnector: context.PAY_CONNECTOR,         // The name of the Twilio Pay connector configured
        paySyncSid: context.PAY_SYNC_SERVICE_SID,             // This need to be moved into payClient
        captureOrder: [
            "payment-card-number",
            "security-code",
            "expiration-date",
        ],
        currency: 'AUD',
        tokenType: 'reusable',
        identity: 'alice',                 // Identity of the Agent for the session
    };

    console.log(`Pay Connector: ${config.payConnector}`);

    callback(null, config);

};




