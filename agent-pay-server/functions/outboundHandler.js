/**
 * This is the Outbound call handler connecting the PBX call to the dialed number and using the assigned CLI.
 * 
 * Once the call is connected, we call the StatusCallback to write the callSID in the UUI sync map.
 * 
 */
exports.handler = function (context, event, callback) {

    const voiceResponse = new Twilio.twiml.VoiceResponse();
    const sipTo = event.To;
    const sipFrom = event.From;

    // Extract E164 numbers for To and From
    const toMatches = sipTo.match(/sip:([+]?[0-9]+)@/);
    const to = toMatches[1];
    const fromMatches = sipFrom.match(/sip:([+]?[0-9]+)@/);
    const from = fromMatches[1];


    if (to && from) {
        // console.log(`Dialing ${to} with Caller ID ${from} - Was to:${sipTo} from:${sipFrom}`);
        const dial = voiceResponse.dial({ callerId: from });
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
        callback(`Error with OutboundHandler: ${error}`, null);
    }
};
