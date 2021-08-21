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
        //console.log(`syncMapItem.key (CallSID): ${syncMapItem.key}`);

        // Now make the call to the SIP end
        const voiceResponse = new Twilio.twiml.VoiceResponse();

        // Remove '+' and send to SIP user -> number@SIP_DOMAIN?User-to-User=CAxxxxx
        const userSipTo = event.To.substring(1) + '@' + context.SIP_DOMAIN + '?' + 'User-to-User=' + event.CallSid;

        // Dial SIP URL
        console.log(`Dialing ${userSipTo}`);
        voiceResponse.dial().sip(userSipTo);

        callback(null, voiceResponse);
    } catch (error) {
        callback(error, null);
    }
};



