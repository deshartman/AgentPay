const express = require('express');
const AccessToken = require('twilio').jwt.AccessToken;

const app = express()
const port = 4000

//app.use(cors);
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true }));    // for express >4.16

//const { response } = require('express');

const twilioAccountSid = process.env.ACCOUNT_SID;
const twilioApiKey = process.env.API_KEY;
const twilioApiSecret = process.env.API_SECRET;
const callHandlerURL = process.env.CALL_HANDLER_URL;    // The Twilio Functions URL where the call handlers are deploye
//const restClient = require('twilio')(twilioApiKey, twilioApiSecret, { twilioAccountSid: twilioAccountSid });


const paySyncSid = process.env.PAY_SYNC_SERVICE_SID;    // TODO: Create the service in Console and update .env file.
const identity = 'alice';                               // TODO: Identity is Merchant responsibility. It is fixed here for demo.
const payConnector = process.env.PAY_CONNECTOR;

// TODO: Only needed for local demo and dev
const cors = require('cors');
const allowedOrigins = ['http://localhost:8080'];
const options = { origin: allowedOrigins };
app.use(cors(options));

//////////////////////// ROUTES ///////////////////////////////

// Default path
app.get('/', (req, res) => {
    res.send('<h1>Merchant Server used to get tokens and manage agent identity</h1>');
});

/**
 * Set up HTTP Axios server config for API calls to the Merchant account
 * 
 * This will eventually be replaced by Pay token logic
 */
app.get('/get-config', (req, res) => {

    res.status(200).send({
        twilioAccountSid: twilioAccountSid,
        twilioApiKey: twilioApiKey,
        twilioApiSecret: twilioApiSecret,
        callHandlerURL: callHandlerURL,     // The Twilio Functions URL where the call handlers are deployed
        payConnector: payConnector,         // The name of the Twilio Pay connector configured
        captureOrder: [
            "payment-card-number",
            "security-code",
            "expiration-date",
        ],
        currency: 'AUD',
        tokenType: 'reusable',
        identity: identity,                 // Identity of the Agent for the session

    });
});

app.get('/sync-token', (req, res) => {

    console.log(`sync-token server`);
    const SyncGrant = AccessToken.SyncGrant;
    const syncGrant = new SyncGrant({
        serviceSid: paySyncSid,
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const accessToken = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity: identity }
    );

    accessToken.addGrant(syncGrant);

    res.status(200).send({
        token: accessToken.toJwt(),
    });
});

app.get('/voice-token', (req, res) => {

    console.log(`voice-token server`);
    const VoiceGrant = AccessToken.VoiceGrant;
    const voiceGrant = new VoiceGrant({
        incomingAllow: true,
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const accessToken = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity: identity }
    );

    accessToken.addGrant(voiceGrant);

    res.status(200).send({
        identity: identity,
        token: accessToken.toJwt(),
    });
});

// app.get('/pay-token', (req, res) => {

//     console.log(`pay-token server`);
//     const payGrant = AccessToken.PayGrant;
//     const payGrant = new PayGrant({
//         serviceSid: callSid,
//     });

//     const accessToken = new AccessToken(
//         twilioAccountSid,
//         twilioApiKey,
//         twilioApiSecret,
//         { identity: identity }
//     );

//     accessToken.addGrant(payGrant);

//     res.status(200).send({
//         identity: identity,
//         token: accessToken.toJwt(),
//     });
// });




app.listen(port, () => {
    console.log(`Merchant Server listening at http://localhost:${port}`)
});