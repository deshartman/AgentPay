/**
 * This is the inbound from PSTN voice handler. Call PBX SIP number, adding callSID as the UUI 
 */
exports.handler = async function (context, event, callback) {

    const restClient = context.getTwilioClient();

    // Write the incoming PSTN call's Call SID as the UUI into Sync
    try {
        // Write the callSID and UUI into Call Map
        const syncMapItem = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
            .syncMaps('uuiMap')
            .syncMapItems
            .create({
                key: event.CallSid,
                data: {
                    "UUI": event.CallSid,
                    "SID": event.CallSid
                },
                ttl: 43200  // 12 hours
            });

        // Now make the call to the endpoint. Comment out what is not needed
        const voiceResponse = new Twilio.twiml.VoiceResponse();

        /**
         * Send the call out to the configured domain as is, adding the User-to-User Identifier (UUI)
         * -> +number@SIP_DOMAIN?User-to-User=CAxxxxx
         */
        const sipTo = event.To + '@' + context.SIP_DOMAIN + '?' + 'User-to-User=' + event.CallSid;

        //console.log(`Dialing ${sipTo}`);
        voiceResponse.dial().sip(sipTo);

        callback(null, voiceResponse);
    } catch (error) {
        callback(error, null);
    }
};



