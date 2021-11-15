# Twilio PayClient library

Twilio PayClient is a proof of concept implementation of Twilio's Pay service, offering PCI DSS payment capture on Twilio voice calls.
Visit the official site for more details: [https://www.twilio.com/pay](https://www.twilio.com/pay)

## Installation

### via NPM

```
npm install --save @deshartman/payclient_functions
```

Using this method, you can use payclient.js like so:

```
import PayClient from "@deshartman/payclient_functions";
const payClient = new PayClient(merchantURL, identity);
payclient.attachPay(callSid);

// When done clean up using:
payclient.detachPay();
```

- "identity" is the Agent identity used for tracking purposes.
- "merchantURL" - Any location returning the config. See [Server Setup](#sever-setup) for suggested Functions option
- "callSid" - The callSID to attach Pay to. See [Methods](methods)

## Usage

### Methods

The client has multiple methods that can be used to drive a user interface. Some examples are given below:

```
    payClient.startCapture();
    payClient.cancelCapture();
    payClient.submitCapture();
    payClient.resetCard();
    payClient.resetSecurityCode();
    payClient.resetDate();
    payclient.updateCallSid(callSid);
```

### Events

The client has multiple events that fire and can be used to drive a User interface. Some examples are given below:

```
    payClient.on('callConnected', (callSid) => {
        payClient.updateCallSid(callSid);
    });

    payClient.on('cardUpdate', (data) => {
        this.paymentCardNumber = data.paymentCardNumber;
        this.paymentCardType = data.paymentCardType
        this.securityCode = data.securityCode
        this.expirationDate = data.expirationDate
        this.paymentToken = data.paymentToken
    };

    payClient.on('capturing', () => { });
    payClient.on('capturingCard', () => { });
    payClient.on('capturingSecurityCode', () => { });
    payClient.on('capturingDate', () => { });
    payClient.on('captureComplete', () => { });
    payClient.on('cardReset', () => { });
    payClient.on('securityCodeReset', () => { });
    payClient.on('dateReset', () => { });
    payClient.on('cancelledCapture', () => { });
    payClient.on('submitComplete', () => { });
```

7. Make a call via Twilio and extract the PSTN side call SID. This is provided to payClient as the call SID. This can be done
   at initiation or after the fact by updating the call Sid.

```
    payclient.updateCallSid(callSid);
```

8. On the PSTN calling handset (customer) now enter the card details using the keypad:

- Enter a test credit card e.g. 4444 3333 2222 1111
- enter a cvc e.g. 123
- enter a future exp. date e.g. 1225

Note: If a mistake was made entering digits, call the resetXXX() methods to reset the entry.

9. When all data has been entered, "Submit" the transaction and wait for a returned token in the 'cardUpdate' event paymentToken.

## Server Setup

To use the library, you need to provide the middleware services and specifically the config back to the client via a merchant server url, where the configuration can be pulled from in the below format. This version uses Twilio Functions to host all the required middleware server functions the NPM will use.

```
    const config = {
        functionsURL: 'https://' + context.DOMAIN_NAME,     // The Twilio Functions URL. Server where "paySyncUpdate" is deployed (See server below)
        payConnector: String,                               // The name of the Twilio Pay connector configured
        paySyncToken: String,                               // Sync JWT token based on Identity
        captureOrder: [                                     // example order of keywords.
            "payment-card-number",
            "security-code",
            "expiration-date",
        ],
        currency: 'AUD',                                    // USD is default
        tokenType: 'reusable',                              // one-time || reusable
    };
```

This can be done with any server, or for convenience, deploy the server using twilio Functions, pasting the code below into Functions and setting the Environment variables.

The middleware server functions can be found here: https://github.com/deshartman/AgentPay as a reference.

### Server: Using Twilio Functions

1. Create an API Key/Secret to use with the services. Update the server "agent-pay-server/.env" with details.

2. Create a Twilio Sync Service and update PAY_SYNC_SERVICE_SID in "agent-pay-server/.env"

3. Create a new Pay connector and note the name of the connector. Update PAY_CONNECTOR in "agent-pay-server/.env"

4. Deploy the Server side with "twilio serverless:deploy". Use the Functions base URL for the Merchant Server URL in PayClient.
   Typically MerchantServerUrl = 'https://' + context.DOMAIN_NAME + 'getConfig'

## Segment Setup

We have also strapped in Segment with this NPM to report on all events as they happen in the NPM. To set this up, sign up for a segment account at www.segment.com.
NOTE: This is completely optional and will function without this config.

1. Add a "Javascript website" Source Connector in Segment
2. Copy the Write Key under settings and set VUE_APP_SEGMENT_WRITEKEY in the client side .env file.
3. To stop logging, simply remove the key

Events will now be logged to Segment and can be processed.
