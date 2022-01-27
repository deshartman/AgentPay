const axios = require('axios');
const checkBearer = require('@deshartman/check-bearer');

exports.handler = async function (context, event, callback) {

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
                "Content-Type": "application/x-www-form-urlencoded", // Required for Twilio API
            },
            timeout: 5000,
        });

        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{callSid}/Payments/{Sid}.json
        let theUrl = '/Calls/' + event.callSid + '/Payments/' + event.paySid + '.json';

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Status', event.Status);
        urlEncodedData.append('IdempotencyKey', event.IdempotencyKey);
        urlEncodedData.append('StatusCallback', event.StatusCallback);

        try {
            const apiResponse = await twilioAPI.post(theUrl, urlEncodedData);
            callback(null, twilioResponse.setBody(apiResponse.data.sid));
        } catch (error) {
            callback(twilioResponse.setBody(`Error with changeSession: ${error}`), null);
        }
    } else {
        callback(twilioResponse.setBody(`Authorisation Error ${authorized.error}`));
    }
};
