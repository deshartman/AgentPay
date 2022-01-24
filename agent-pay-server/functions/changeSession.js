const axios = require('axios');

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


    const restClient = context.getTwilioClient();

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
        const response = await twilioAPI.post(theUrl, urlEncodedData);
        callback(null, sendResponse(response.data.sid));
    } catch (error) {
        callback(sendResponse(`Error with changeSession: ${error}`), null);
    }
};