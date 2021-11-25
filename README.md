# Pay Client: Client and Server

There are three parts and various branches to this project:

- agent-pay-server
- agent-pay-client
- module

## Branches

- Master: This is the main and demo branch, using a registered SIP endpoint on a Twilio domain. Use this to test concepts. It has a demo Vue page
- UUI: This branch uses a User-to-User header in the SIP message to determine, which agent behind a PBX has taken the call. This requires coding/CTI integration on the PBX. It has a demo Vue page
- PIN: This branch (future) will use a API PIN to identify the agent call. TBD

## Client (agent-pay-client)

The Client is a any frontend you chose using the payclient/AgentAssistedPayClient module. The module does all the heavy lifting for Pay and Sync, so the client implementation only has to deal with the visual components of the implementation. There are various implementations, all contained in their own branches. Switch the relevant branch to use the implementation:

- Master: This is a Demo branch. Functions handling SIP calls to a registered SIP endpoint. Demo Vue frontend code
- UUI: Functions with User-to-User SIP parameter handling for outbound calls. Demo Vue frontend. Delete agent-pay-client content to create own front-end
- CallRef: Functions with Twilio Gather on Agent leg for calls. Demo Vue frontend. Delete agent-pay-client content to create own front-end
- Flex: Functions into Flex implementation calling and Twilio Flex plugin frontend code

## Server (agent-pay-server)

The server uses Twilio Sync to keep track of calls and payment progression, to which the Client subscribes for updates. The functions are used to handle inbound and outbound calls to a SIP PBX and/or registered Twilio SIP endpoint, depending on the branch selected.

For the demo we use a Twilio SIP registered client. How the call is routed depends on the direction of the call:

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

## Module

This is the main Agent Assisted code, that gets used by the client. It uses Twilio Sync as a way to keep track of Twilio Pay changes in real time on the client side. In the mater branch, this is set up to be an NPM module, while in all other branches, it is just a JS file with dependencies.

# Project setup

- Select the required branch
- Clone the repository.

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

6. Optionally add a Segment WriteKey and update VUE_APP_SEGMENT_WRITEKEY in "agent-pay-client/.env".

### OPTIONAL Segment Setup

We have also strapped in Segment to report on all events as they happen in the NPM. To set this up, sign up for a segment account at www.segment.com.
NOTE: This is completely optional and will function without this config.

1. Add a "Javascript website" Source Connector in Segment
2. Copy the Write Key under settings and set VUE_APP_SEGMENT_WRITEKEY in the client side .env file.
3. To stop logging, simply remove the key

Events will now be logged to Segment and can be processed.

# Testing & Use

## Inbound Voice Calls

- Make an inbound test call to make sure the SIP endpoint receives the call.
- Check the Sync service map "uuiMap" to make sure a Call SID was written

# Outbound Voice Calls

- Make an outbound call from the SIP endpoint to any number
- Check the Sync service map "uuiMap" to make sure a UUI was written and a corresponding Call SID
- NOTE: In production the UUI needs to be generated by the PBX

## Take Payment Demo

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
