/**
 * This is the StatusCallback where the outboundHandler POSTs to. Once we receive a status callback, we now update the
 * UUI Sync Map with Call SID with the data we received:
 * 
 * 1) Extract UUI value from PBX call leg (parent Call SID)
 * 2) Write into UUI sync Map
 *
 * call UUI: a UUI from the PBX endpoint, which links to the Call SID eventually for outbound calls
 * 
 */
exports.handler = async function (context, event, callback) {
  //console.log(`Call SID: ${event.CallSid}`);

  const restClient = context.getTwilioClient();

  try {
    //console.log(`Use ParentCallSid to get UUI`);
    var parentCall = await restClient.calls(event.ParentCallSid).fetch();
    console.log(`parentCall: ${JSON.stringify(parentCall, null, 4)}`);

    // Split to get the UUI parameter
    const paramPart = parentCall.to.split("?")[1];
    const params = new URLSearchParams(paramPart);
    const uui = params.get('User-to-User');

    // If we have a UUI, then we can update the UUI Sync Map
    if (uui) {
      try {
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps('uuiMap')
          .syncMapItems
          .create({
            key: uui,
            data: {
              "uui": uui,
              "pstn-sid": event.CallSid,
              "pbx-sid": parentCall.sid,
            },
            ttl: 43200  // 12 hours
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
