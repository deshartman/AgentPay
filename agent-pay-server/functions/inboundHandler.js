/**
 * This is the inbound from PSTN voice handler. Call PBX SIP number, adding callSID as the UUI
 * Nothing is written to the sync outboundCallMap, since the GUID is the callSID
 * 
 */
exports.handler = async function (context, event, callback) {

    const restClient = context.getTwilioClient();

    // Write the incoming PSTN call CallSID as the UUI into Sync
    try {
        // Write the callSID and UUI into outboundCall Map
        const syncMapItem = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
            .syncMaps('guidMap')
            .syncMapItems
            .create({
                key: event.CallSid,
                data: {
                    "UUI": event.CallSid,
                    "SID": event.CallSid
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
         * Convention is to use the twilio number sans the "+" as the username to register and the SIP domain of the SIP trunk
         * -> number@SIP_DOMAIN?User-to-User=CAxxxxx
         */
        // Send to SIP user -> sip:+number@SIP_DOMAIN?User-to-User=CAxxxxx
        //const userSipTo = event.To.substring(1) + '@' + context.SIP_DOMAIN + '?' + 'User-to-User=' + event.CallSid;
        const userSipTo = event.To + '@' + context.SIP_DOMAIN + '?' + 'User-to-User=' + event.CallSid;

        // Dial SIP URL
        console.log(`Dialing ${userSipTo}`);
        voiceResponse.dial().sip(userSipTo);

        /**
         * 2) WebRTC Client TODO: Add example code here
         */

        /**
         * 3) SIP Trunk
         * Send the call out to the configured domain as is.
         */







        callback(null, voiceResponse);
    } catch (error) {
        callback(error, null);
    }
};



