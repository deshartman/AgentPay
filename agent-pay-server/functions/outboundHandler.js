/**
 * This is the outbound to PSTN voice handler that routes the call from the Customer to a PSTN destination.
 * The PSTN side call SID is written into a Sync map as reference, so Pay can be attached.
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
