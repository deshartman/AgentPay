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

    //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments.json
    let theUrl = '/Calls/' + event.callSid + '/Payments.json';
    //console.log(`startCapture url: [${ theUrl }]`);
    // this._captureOrder = this._captureOrderTemplate.slice(); // Copy value

    // URL Encode the POST body data
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('IdempotencyKey', event.IdempotencyKey);
    urlEncodedData.append('StatusCallback', event.StatusCallback);
    urlEncodedData.append('ChargeAmount', event.ChargeAmount);
    urlEncodedData.append('TokenType', event.TokenType);
    urlEncodedData.append('Currency', event.Currency);
    urlEncodedData.append('PaymentConnector', event.PaymentConnector);
    urlEncodedData.append('SecurityCode', event.SecurityCode);
    urlEncodedData.append('PostalCode', event.PostalCode);

    console.log(`startCapture: urlEncoded data = ${urlEncodedData} `);

    try {
        const response = await twilioAPI.post(theUrl, urlEncodedData);

        console.log(response);

        const _paySid = response.data.sid;

        console.log(`StartCapture: paySID: ${_paySid} `);

        callback(null, sendResponse(_paySid));
    } catch (error) {
        console.error(`Error with StartCapture: ${error} `);
        callback(error, null);
    }
};
