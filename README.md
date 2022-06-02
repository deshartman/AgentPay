# Pay Client: Client and Server

There are three parts and various branches to this project:

- agent-pay-server
- agent-pay-client

Using a registered SIP endpoint on a Twilio domain. Use this to test concepts. uses a User-to-User header in the SIP message to determine, which agent behind a PBX has taken the call. This requires coding/CTI integration on the PBX. It has a demo Svelte page.
## Client (agent-pay-client)

The Client is a any frontend you chose using the payclient/AgentAssistedPayClient NPM. The NPM does all the heavy lifting for Pay and Sync, so the client implementation only has to deal with the visual components of the implementation. Functions handling SIP calls to a registered SIP endpoint. Demo Svelte frontend code.

The login page is just a mock and needs to be replaced for proper login and to obtain the sync token (bearer). To log in, you need to  use the Twilio Auth Token.

## Server (agent-pay-server)

The server uses Twilio Sync to keep track of calls and payment progression, to which the Client subscribes for updates. The functions are used to handle inbound and outbound calls to a SIP PBX and/or registered Twilio SIP endpoint, depending on the branch selected.

For the demo we use a Twilio SIP registered client. How the call is routed depends on the direction of the call:

### Inbound

Convention is that the SIP domain configured under "ORIGINATION_URI" needs to correspond with the SIP PBX or Twilio Registered SIP user.
When the call is made we will automatically add a User-to-User attribute to the call, which will be the PSTN side CallSID. We will
also write the CallSID into a Sync map.

Note: When registering a Twilio SIP user, the username MUST include the "+", i.e., +number@ORIGINATION_URI

### Outbound

As with inbound, the user and domain is derived from what is sent to us from the SIP PBX. The SIP PBX MUST also send a unique
User-To-User header "+E164@ORIGINATION_URI?User-to-User=XXXXXXXXXX". As with Inbound, the PSTN side UUI will be written into
a Sync Map along with the CallSID, but only once the call has been answered.

Note: When the SIP PBX sends the call, they MUST configure the +E.164@domain as the Twilio +E.164 number. This will be extracted
and used as the CLI.

The Merchant can now query with the UUI to find the CallSID and use that to initiate the Pay components.

## NPM Module

The main Agent Assisted code, which is now an NPM module (https://www.npmjs.com/package/@deshartman/agent-pay) , that gets used by the client. It uses Twilio Sync as a way to keep track of Twilio Pay changes in real time on the client side. The source is at https://github.com/deshartman/AgentPay.

NOTE: It uses the sync token as a bearer authorisation for all subsequent calls. The bearer is verified using the API Key secret on the server side, so it is not possible to call the server side functions without a sync token used as a bearer


# Project setup

- Clone the repository.

## Set up the Server

```
cd agent-pay-server
npm install
```

1. Create an API Key/secret to use with the services. Update the server "agent-pay-server/.env" with details.

2. Create a Twilio Sync Service named "AgentAssistedPaySync" and update PAY_SYNC_SERVICE_SID in "agent-pay-server/.env"

3. Configure a SIP Domain and registered SIP users as required and update ORIGINATION_URI in "agent-pay-server/.env"

4. Deploy the Server side with "twilio serverless:deploy"

5. Configure your inbound Twilio number to call Functions/agent-pay-server/inboundHandler

6. Configure your Voice SIP Domains Call Control to point to https://agent-pay-server-XXXX-YYY.twil.io/outboundHandler

## Set up the Client

```
cd agent-pay-client
npm install
```

1. Using the Domain from the above Server deploy, update the VITE_FUNCTIONS_URL in "agent-pay-client/.env"

2. Create a new Pay connector and update VITE_PAYMENT_CONNECTOR in "agent-pay-client/.env". Default is a single connector, but can be multiple as comma separated list.

3. Define the capture order and update VITE_CAPTURE_ORDER in "agent-pay-client/.env". Default is "payment-card-number,security-code,expiration-date"

4. Define the currency and update VITE_CURRENCY in "agent-pay-client/.env". Default is "USD"

5. Define the token type and update VITE_TOKEN_TYPE in "agent-pay-client/.env". Default is "reusable"

6. Optionally add a Segment WriteKey and update VITE_SEGMENT_WRITEKEY in "agent-pay-client/.env".

### OPTIONAL Segment Setup

We have also strapped in Segment to report on all events as they happen in the NPM. To set this up, sign up for a segment account at www.segment.com.
NOTE: This is completely optional and will function without this config.

1. Add a "Javascript website" Source Connector in Segment
2. Copy the Write Key under settings and set VITE_SEGMENT_WRITEKEY in the client side .env file.
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

- "npm run dev"

2. Go to the client URL

3. Log in to get a Sync token (Any username and password)

4. Make a call to the SIP user or PBX from a PSTN number

5. Once answered, click the "Start Pay Session" button.

6. On the calling handset now enter the card details using the keypad:

- Enter a test credit card e.g. 4444 3333 2222 1111
- enter a cvc e.g. 123
- enter a future exp. date e.g. 1225

Note: Click the "x" next to the item if a mistake was made entering to reset the entry.

7. When all data has been entered, click "Submit" button and a token should be returned.

---
