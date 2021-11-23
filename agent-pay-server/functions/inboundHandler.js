/**
 * This is the inbound from PSTN voice handler that routes the call to the Customer destination.
 * This could be:
 * 1) Registered SIP client
 * 2) SIP Trunk domain (to PBX)
 * 3) WebRTC client
 * 
 * The PSTN side call SID is written into a Sync map as reference, so Pay can be attached.
 * 
 * Process:
 * 1) Assume uuiMap exists and create new mapItem with inbound call Sid as key and uui.
 * 2) If it fails, SyncMap uuiMap does not exist, so create it and add new data.
 * 3) Finally, create new call leg.
 * 
 */
exports.handler = async function (context, event, callback) {

    const restClient = context.getTwilioClient();

    const createMapItem = async () => {
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
            .syncMaps('uuiMap')
            .syncMapItems
            .create({
                key: event.CallSid,
                data: {
                    "uui": event.CallSid,
                    "pstnSid": event.CallSid
                },
                ttl: 43200  // 12 hours
            });
    }

    // Write the incoming PSTN call's Call SID as the UUI into Sync
    try {
        // Since the uuiMap may not yet exist, we need to update it under a try/catch. If it does not exist, create and then add item
        try {
            // Write the callSID and UUI into Sync Map
            await createMapItem();
        } catch (error) {
            // SyncMap uuiMap does not exist, so create it
            await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
                .syncMaps
                .create({ uniqueName: 'uuiMap' });

            // Now write the callSID and UUI into Sync Map
            await createMapItem();
        } finally {
            console.log("Finally");
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
        }
    } catch (error) {
        // Some other error occurred
        callback(`Error with InboundHandler: ${error}`, null);
    }
};



