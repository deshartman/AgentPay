/**
 * This is the inbound from PSTN voice handler. Call PBX SIP number, adding callSID as the UUI
 * Nothing is written to the sync outboundCallMap, since the UUI is the callSID
 * 
 */
exports.handler = async function (context, event, callback) {

    const restClient = context.getTwilioClient();

    console.log(`Inbound handler. Service Sid: ${context.PAY_SYNC_SERVICE_SID} with Call Sid: ${event.CallSid} `);

    // Write the incoming PSTN call's Call SID as the UUI into Sync
    try {
        // Write the callSID and UUI into outboundCall Map
        const syncMapItem = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
            .syncMaps('uuiMap')
            .syncMapItems
            .create({
                key: event.CallSid,
                data: {
                    "uui": event.CallSid,
                    "pstn-sid": event.CallSid
                },
                ttl: 43200  // 12 hours
            });

        /**
         * Now make the call to the endpoint. Comment out what is not needed
         * 1) Registered SIP user
         * 2) Client endpoint
         * 3) SIP Trunk with domain
        */
        const voiceResponse = new Twilio.twiml.VoiceResponse();

        /**
         * 1) Registered SIP endpoint:
         * Convention is to use the twilio number as the username, including the "+", to register and the SIP domain as required
         * This allows us to use the same code for registered users and SIP trunks
         * 
         * 3) SIP Trunk
         * Send the call out to the configured domain as is.
         * 
         * -> +number@SIP_DOMAIN?User-to-User=CAxxxxx
         */
        // Send to SIP user -> sip:+number@SIP_DOMAIN?User-to-User=CAxxxxx
        const sipTo = event.To + '@' + context.SIP_DOMAIN + '?' + 'User-to-User=' + event.CallSid;

        // Dial SIP URL
        console.log(`Dialing ${sipTo}`);
        voiceResponse.dial().sip(sipTo);

        /**
         * 2) WebRTC Client TODO: Add example code here
         */


        callback(null, voiceResponse);
    } catch (error) {
        callback(error, null);
    }
};



