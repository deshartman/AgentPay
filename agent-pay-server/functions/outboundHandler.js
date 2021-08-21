/**
 * This is the Outbound call handler connecting the PBX call to the dialed number and using the assigned CLI.
 * 
 * Once the call is connected, we call the StatusCallback to write the callSID in the GUID sync map.
 * 
 */

exports.handler = function (context, event, callback) {
    const voiceResponse = new Twilio.twiml.VoiceResponse();

    //console.log(`event: ${JSON.stringify(event, null, 4)}`)
    const sipTo = event.To;
    //console.log(`sipTo: ${sipTo}`);
    // Extract E164
    const matches = sipTo.match(/sip:([+]?[0-9]+)@/);

    if (matches && matches.length > 1) {
        // Dial PSTN number with Twilio CLI
        const to = matches[1];
        //console.log(`Dialing ${to} from ${sipTo} with Caller ID ${context.TWILIO_CLI}`);

        const dial = voiceResponse.dial(
            {
                callerId: context.TWILIO_CLI,
            });
        dial.number(
            {
                // Only update Sync when call is answered
                statusCallbackEvent: 'answered',
                statusCallback: '/outboundSyncUpdate',
                statusCallbackMethod: 'POST'
            },
            to);
        callback(null, voiceResponse);
    } else {
        callback(error, null);
    }
};
