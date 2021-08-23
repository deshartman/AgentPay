/**
 * This is the StatusCallback where the outboundHandler POSTs to.
 * Once we receive a status callback, we now update the GUID Sync Map with CallSID with the data we received:
 * 
 * 1) Extract UUI value from PBX call leg (parent Call SID)
 * 2) Write into GUID sync Map
 *
 * callGUID: a GUID from the PBX endpoint, which links to the CallSID eventually for outbound calls
 * 
 */
exports.handler = async function (context, event, callback) {
  //console.log(`Inside outboundSyncUpdate`);
  console.log(`Call SID: ${event.CallSid}`);

  const restClient = context.getTwilioClient();

  try {
    //console.log(`Use ParentCallSid to get UUI`);
    var parentCall = await restClient.calls(event.ParentCallSid).fetch();
    //console.log(`parentCall: ${JSON.stringify(parentCall, null, 4)}`);
    parentCall.to = 'sip:+61401277115@example.com?User-to-User=123456789'; // TODO: Test with UUI. This is temp to test
    console.log(`parentCall To: ${parentCall.to}`);

    const paramPart = parentCall.to.split("?")[1];
    const params = new URLSearchParams(paramPart);
    const uui = params.get('User-to-User');
    //console.log(`sp.User-to-User: ${uui}`);

    if (uui) {
      // Write the CallSid into Sync
      try {
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps('guidMap')
          .syncMapItems
          .create({
            key: uui,
            data: {
              "UUI": uui,    //Check param. Might be URLEncoded
              "SID": event.CallSid
            },
            ttl: 86400
          });
        callback(null, uui);
      } catch (error) {
        callback(error, null);
      }
    } else {
      //console.error(`Cannot extract UUI from call, so cannot establish Pay ${error}`);
      callback('Cannot extract UUI from call, so cannot establish Pay', null);
    }
  } catch (error) {
    callback(error, null);
  }
};
