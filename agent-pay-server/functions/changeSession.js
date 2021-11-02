const axios = require('axios');

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
            "Content-Type": "application/x-www-form-urlencoded", // _Required for Twilio API
        },
        timeout: 5000,
    });

    //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{callSid}/Payments/{Sid}.json
    let theUrl = '/Calls/' + event.callSid + '/Payments/' + event.paySid + '.json';

    console.log(`Change Session URL: [${theUrl}]`);

    // URL Encode the POST body data
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('Status', event.Status);
    urlEncodedData.append('IdempotencyKey', event.IdempotencyKey);
    urlEncodedData.append('StatusCallback', event.StatusCallback);

    console.log(`changeSession: urlEncoded data = ${urlEncodedData} `);

    try {
        const response = await twilioAPI.post(theUrl, urlEncodedData);

        console.log(response);

        callback(null, sendResponse(response.data.sid));
    } catch (error) {
        console.error(`Error with changeSession: ${error} `);
        callback(error, null);
    }
};