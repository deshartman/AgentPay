# agent-pay: Client and Server

There are two parts to this project:

- agent-pay-client
- agent-pay-server

## Client

The Client is a Vue frontend to show what could be built. This cab be ANY implementation and not just Vue. The main use is to use
the small pay SDK JS file "PayClient", which does all the heavy lifting for Pay and Sync.

In addition to the client, there is also an example Merchant server. The intention is that the Merchant server is where the Agent
currently gets their user interface from and thus would serve the pay component as an asset. The Merchant server is used to
set up configuration details for Pay, including the API Keys.

The VUE_APP_MERCHANT_SERVER_URL tells the Merchant server where to get Config and Sync updates from, using the same Sync Service SID
as for the server. In this release we are using a Functions URL to provide the config. Merchant can change this to provide the config
to the client.

Note: Even though we still use API_Key and Secret, they are presented via the Merchant server and not directly in the Client code. Once
a Pay Token service is created, this need is removed.

## Server

The server uses Twilio Sync to keep track of calls and payment progression, to which thee Client subscribes. The functions are used
to handle inbound and outbound calls to a SIP PBX or registered Twilio SIP endpoint.

### Inbound

Convention is that the SIP domain configured under "SIP_DOMAIN" needs to correspond with the SIP PBX or Twilio Registered SIP user.
When the call is made we will automatically add a User-to-User attribute to the call, which will be the PSTN side CallSID. We will
also write the CallSID into a Sync map.

Note: When registering a Twilio SIP user, the username MUST include the "+", i.e., +number@SIP_DOMAIN

### Outbound

As with inbound, the user and domain is derived from what is sent to us from the SIP PBX. The SIP PBX MUST also send a unique
USer-To-User header "+E164@SIP_DOMAIN?User-to-User=XXXXXXXXXX". As with Inbound, the PSTN side UUI will be written into
a Sync Map along with the CallSID, but only once the call has been answered.

Note: When the SIP PBX sends the call, they MUST configure the +E.164@domain as the Twilio +E.164 number. This will be extracted
and used as the CLI.

The Merchant can now query with the UUI to find the CallSID and use that to initiate the Pay components.

# Project setup

Clone the repository.

## Set up the Server

```
cd agent-pay-server
npm install
```

1. Create an API Key/secret to use with the services. Update the server "agent-pay-server/.env" with details.

2. Create a Twilio Sync Service named "AgentAssistedPaySync" and update PAY_SYNC_SERVICE_SID in "agent-pay-server/.env"

3. Configure a SIP Domain and registered SIP users as required and update SIP_DOMAIN in "agent-pay-server/.env"

4. Deploy the Server side with "twilio serverless:deploy"

5. Configure your inbound Twilio number to call Functions/agent-pay-server/inboundHandler

6. Configure your Voice SIP Domains Call Control to point to https://agent-pay-server-XXXX-YYY.twil.io/outboundHandler

## Set up the Client

```
cd agent-pay-client
npm install
```

1. Using the Domain from the above Server deploy, update the VUE_APP_FUNCTIONS_URL in "agent-pay-client/.env"

- For Dev mode update vue.config.js with the URL
- For production update VUE_APP_FUNCTIONS_URL in "agent-pay-client/.env"

2. Create a new Pay connector and update VUE_APP_PAYMENT_CONNECTOR in "agent-pay-client/.env"

3. Define the capture order and update VUE_APP_CAPTURE_ORDER in "agent-pay-client/.env". Default is "payment-card-number,security-code,expiration-date"

4. Define the currency and update VUE_APP_CURRENCY in "agent-pay-client/.env". Default is "USD"

5. Define the token type and update VUE_APP_TOKEN_TYPE in "agent-pay-client/.env". Default is "reusable"

6. Optionally add a Segment WriteKey

### Segment Setup

We have also strapped in Segment to report on all events as they happen in the NPM. To set this up, sign up for a segment account at www.segment.com.
NOTE: This is completely optional and will function without this config.

1. Add a "Javascript website" Source Connector in Segment
2. Copy the Write Key under settings and set VUE_APP_SEGMENT_WRITEKEY in the client side .env file.
3. To stop logging, simply remove the key

Events will now be logged to Segment and can be processed.

## Testing & Use

### Inbound Voice Calls

- Make an inbound test call to make sure the SIP endpoint receives the call.
- Check the Sync service map "guidMap" to make sure a Call SID was written

### Outbound Voice Calls

- Make an outbound call from the SIP endpoint to any number
- Check the Sync service map "guidMap" to make sure a UUI was written and a corresponding Call SID
- NOTE: this is a hack with the UUI a randomly generated value. In production the UUI needs to be generated by the PBX

### Take Payment

1. Start the client via NPM script

- "Vue serve"

2. Go to the client URL

3. Make a call to the SIP user or PBX from a PSTN number

4. Once answered, click the "Start Pay Session" button.

5. On the calling handset now enter the card details using the keypad:

- Enter a test credit card e.g. 4444 3333 2222 1111
- enter a cvc e.g. 123
- enter a future exp. date e.g. 1225

Note: Click the "x" next to the item if a mistake was made entering to reset the entry.

6. When all data has been entered, click "Submit" button and a token should be returned.

---

Below is an overall architecture diagram of the setup, showing an inbound call

![Agent Assisted Payment - PBX](https://user-images.githubusercontent.com/47675451/131450481-76f83636-35a8-4558-adf4-ce9679c72465.png)
