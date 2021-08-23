const express = require('express');
const AccessToken = require('twilio').jwt.AccessToken;

const app = express()
const port = 4000

//app.use(cors);
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true }));    // for express >4.16

//const { response } = require('express');

const accountSid = process.env.VUE_APP_ACCOUNT_SID;
const apiKey = process.env.VUE_APP_API_KEY;
const apiSecret = process.env.VUE_APP_API_SECRET;
//const restClient = require('twilio')(apiKey, apiSecret, { accountSid: accountSid });


const paySyncSid = process.env.PAY_SYNC_SERVICE_SID;    // TODO: Create the service in Console and update .env file.
const identity = 'alice';                               // TODO: Identity is Merchant responsibility. It is fixed here for demo.

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

app.get('/sync-token', (req, res) => {

    console.log(`sync-token server`);
    const SyncGrant = AccessToken.SyncGrant;
    const syncGrant = new SyncGrant({
        serviceSid: paySyncSid,
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const accessToken = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: identity }
    );

    accessToken.addGrant(syncGrant);

    res.status(200).send({
        identity: identity,
        token: accessToken.toJwt(),
    });
});

app.listen(port, () => {
    console.log(`Merchant Server listening at http://localhost:${port}`)
});