const axios = require('axios');
const checkBearer = require('@deshartman/check-bearer');

exports.handler = async function (context, event, callback) {
    //    console.log(`Update Capture event: ${JSON.stringify(event, null, 4)}`);
    const authorized = checkBearer(event.request.headers, context.API_SECRET);
    const twilioResponse = new Twilio.Response();

    if (authorized.valid) {

        // Add CORS handling headers
        twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
        twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        twilioResponse.appendHeader("Content-Type", "application/json");

        const twilioAPI = axios.create({
            baseURL:
                'https://api.twilio.com/2010-04-01/Accounts/' + context.ACCOUNT_SID,
            auth: {
                // Basic Auth using API key
                username: context.API_KEY,
                password: context.API_SECRET
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded", // _Required for Twilio API
            },
            timeout: 5000,
        });

        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + event.callSid + '/Payments/' + event.paySid + '.json';

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Capture', event.captureType);
        urlEncodedData.append('IdempotencyKey', event.IdempotencyKey);
        urlEncodedData.append('StatusCallback', event.StatusCallback);

        try {
            const apiResponse = await twilioAPI.post(theUrl, urlEncodedData);
            return callback(null, twilioResponse.setBody(apiResponse.data.sid));
        } catch (error) {
            twilioResponse.setStatusCode(400);
            return callback(null, twilioResponse.setBody(`Error with updateCapture: ${error}`));
        }
    } else {
        twilioResponse.setStatusCode(401);
        return callback(null, twilioResponse.setBody(`Authorisation Error ${authorized.error}`));
    }
};