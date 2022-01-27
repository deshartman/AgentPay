const axios = require('axios');
const checkBearer = require('@deshartman/check-bearer');

exports.handler = async function (context, event, callback) {

    const authorized = checkBearer(event.request.headers, context.API_SECRET);
    //console.log(`StartCapture authorized: ${JSON.stringify(authorized, null, 4)}`);
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

        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments.json
        let theUrl = '/Calls/' + event.callSid + '/Payments.json';

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

        try {
            const apiResponse = await twilioAPI.post(theUrl, urlEncodedData);
            callback(null, twilioResponse.setBody(apiResponse.data.sid));   // Pay SID
        } catch (error) {
            callback(twilioResponse.setBody(`Error with StartCapture: ${error}`), null);
        }
    } else {
        callback(twilioResponse.setBody(`Authorisation Error ${authorized.error}`));
    }
};