# agent-pay: Client and Server

## Project setup

Clone the repository.

```
npm install
```

# Customize configuration

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

# Configuration steps:

1. Create an API Key/secret to use with the services. Update the server "agent-pay-server/.env" with details.

2. Create a Twilio Sync Service and update PAY_SYNC_SERVICE_SID in "agent-pay-server/.env"

3. Create a new Pay connector and note the name of the connector. Update PAY_CONNECTOR in "agent-pay-server/.env"

4. Configure a SIP Domain and registered users as required and update SIP_DOMAIN in "agent-pay-server/.env"

5. Deploy the Server side with "twilio serverless:deploy" and update the client "agent-pay-client/.env" with the VUE_APP_MERCHANT_SERVER_URL.

6. Test Voice calls

- make an inbound test call to make sure the SIP endpoint receives the call.
- Check the Sync service map "guidMap" to make sure a Call SID was written
- Make an outbound call from the SIP endpoint to any number
- Check the Sync service map "guidMap" to make sure a UUI was written and a corresponding Call SID

5. Start the client via NPM script

- "Vue serve"

6. Go to the client URL

7. Make a call to the SIP user or PBX from a PSTN number

8. Once answered, click the "Start Pay Session" button.

9. on the calling handset now enter the card details using the keypad:

- Enter a test credit card e.g. 4444 3333 2222 1111
- enter a cvc e.g. 123
- enter a future exp. date e.g. 1225

Note: Click the "x" next to the item if a mistake was made entering to reset the entry.

10. When all data has been entered, click "Submit" button and a token should be returned.

---

Below is an overall architecture diagram of the setup, showing an inbound call

![Agent Assisted Payment - PBX](https://user-images.githubusercontent.com/47675451/131450481-76f83636-35a8-4558-adf4-ce9679c72465.png)
