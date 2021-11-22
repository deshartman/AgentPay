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

    ///////////////////////// TEMP CODE /////////////////////////////
    parentCall.to = 'sip:+61401277115@example.com?User-to-User=' + Math.round(Math.random() * 1000000000); // TODO: Test with UUI. This is temp to test
    //////////////////////////////////////////////////////
    //console.log(`parentCall To: ${parentCall.to}`);

    const paramPart = parentCall.to.split("?")[1];
    const params = new URLSearchParams(paramPart);
    const uui = params.get('User-to-User');

    if (uui) {
      // Write the CallSid into Sync
      // Since the uuiMap may not yet exist, we need to update it under a try/catch. If it does not exist, create and then add item
      try {
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps('uuiMap')
          .syncMapItems
          .create({
            key: uui,
            data: {
              "uui": uui,    //Check param. Might be URLEncoded
              "pstn-sid": event.CallSid
            },
            ttl: 86400
          });
      } catch (error) {
        // SyncMap uuiMap does not exist, so create it
        const uuiSyncMap = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps
          .create({ uniqueName: 'uuiMap' });
      }
      finally {
        // Create the syncMapItem
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps('uuiMap')
          .syncMapItems
          .create({
            key: uui,
            data: {
              "uui": uui,    //Check param. Might be URLEncoded
              "pstn-sid": event.CallSid
            },
            ttl: 86400
          });
        //console.log(`Done with outboundSyncUpdate`);
        callback(null, uui);
      }
    } else {
      //console.error(`Cannot extract UUI from call, so cannot establish Pay ${error}`);
      callback('Cannot extract UUI from call, so cannot establish Pay', null);
    }
  } catch (error) {
    // Some other error occurred
    callback(error, null);
  }
};
