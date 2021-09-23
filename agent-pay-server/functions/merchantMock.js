/**
 * This Function mocks what would normally be the Merchant internal server. Expectation is that
 * the Agent would log into the Merchant server and request access to the payment page, at which
 * point the merchant server would make a call to Twilio to get a Pay token (which does not yet
 * exist).
 * 
 * Call this with an identity parameter 
 * 
 *  * @example
 * ```
 * curl --location --request POST 'https://agent-pay-server-9985-dev.twil.io/merchantMock' \
 *  --header 'Content-Type: application/x-www-form-urlencoded' \
 *  --data-urlencode 'identity=somebody'
 * ```
 * 
 * NB: This is sensitive data and only used as a temporary method to pass this to the client.
 */
const Axios = require("axios");

exports.handler = async function (context, event, callback) {

    const tokenType = 'reusable';
    const captureOrder = [
        "payment-card-number",
        "security-code",
        "expiration-date",
    ];
    const currency = 'AUD';

    const data = {
        "identity": event.identity,
        "twilioAccountSid": context.ACCOUNT_SID,
        "twilioApiKey": context.API_KEY,
        "twilioApiSecret": context.API_SECRET,
        "functionsURL": 'https://' + context.DOMAIN_NAME,  // The Twilio Functions URL where the call handlers are deployed
        "payConnectorSid": context.PAY_CONNECTOR_SID,             // The name of the Twilio Pay connector configured
        "paySyncSid": context.PAY_SYNC_SERVICE_SID,
        "ttl": 86400,
    };

    try {
        const response = await Axios.post('https://' + context.DOMAIN_NAME + '/payClientMock', data);
        callback(null, response.data);
    } catch (error) {
        callback(`Could not get a token with Error: ${error}`, null);
    }
};




