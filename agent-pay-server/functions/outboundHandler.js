/**
 * This is the outbound to PSTN voice handler that routes the call from the Customer to a PSTN destination.
 * The PSTN side call SID is written into a Sync map as reference, so Pay can be attached.
 *
 * Once the call is connected, we call the StatusCallback to write the callSID in the UUI sync map.
 * 
 */
exports.handler = function (context, event, callback) {

    const voiceResponse = new Twilio.twiml.VoiceResponse();

    let to = event.To.match(/^sip:((\+)?[0-9]+)@(.*)/)[1];
    let from = event.From.match(/^sip:((\+)?[0-9]+)@(.*)/)[1];

    console.log(`outboundHandler Event Details: ${JSON.stringify(event, null, 4)}`);

    let UUIX = event["SipHeader_User-to-User"];

    console.log(`UUIX: ${UUIX}`);

    try {
        console.log(`Dialing ${to} with Caller ID ${from}`);
        const dial = voiceResponse.dial({ callerId: from });
        dial.number(
            {
                // Only update Sync when call is answered
                statusCallbackEvent: 'answered',
                statusCallback: `/outboundSyncUpdate?UUI=${UUIX}`,
                statusCallbackMethod: 'POST'
            },
            to);

        return callback(null, voiceResponse);
    } catch (error) {
        return callback(`Error with OutboundHandler: ${error}`, null);
    }
};
