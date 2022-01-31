/**
 * This is the StatusCallback where the outbound call handler POSTs to.
 * Once we receive a status callback, we now update the UUI Sync Map with CallSID with the data we received:
 * 
 *
 * UUI: a UUI from the PBX endpoint, which links to the CallSID eventually for outbound calls
 * 
 * Process:
 * 1) Extract UUI value from PBX call leg (parent Call SID)
 * 2) Write into UUI sync Map
 * 3) Assume uuiMap exists and create new mapItem with inbound call Sid as key and uui.
 * 4) If it fails, SyncMap uuiMap does not exist, so create it and add the data.
 * 5) Finally, return the UUI
 *
 */
exports.handler = async function (context, event, callback) {

  const restClient = context.getTwilioClient();

  const createMapItem = async () => {
    await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
      .syncMaps('uuiMap')
      .syncMapItems
      .create({
        key: uui,
        data: {
          "uui": uui,
          "pstnSid": event.CallSid
        },
        ttl: 43200  // 12 hours
      });
  }

  try {
    var parentCall = await restClient.calls(event.ParentCallSid).fetch();

    ///////////////////////// TEMP DEMO CODE /////////////////////////////
    parentCall.to = 'sip:+61401277115@example.com?User-to-User=' + Math.round(Math.random() * 1000000000);
    //////////////////////////////////////////////////////

    const paramPart = parentCall.to.split("?")[1];
    const params = new URLSearchParams(paramPart);
    const uui = params.get('User-to-User');

    if (uui) {
      // Since the uuiMap may not yet exist, we need to update it under a try/catch. If it does not exist, create and then add item
      try {
        // Write the CallSid into Sync
        await createMapItem();
      } catch (error) {
        // SyncMap uuiMap does not exist, so create it
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps
          .create({ uniqueName: 'uuiMap' });
        // No create the syncMapItem
        await createMapItem();
      }
      finally {
        return callback(null, uui);
      }
    } else {
      return callback(null, 'Cannot extract UUI from call, so cannot establish Pay');
    }
  } catch (error) {
    return callback(`Error with Outbound Sync Update: ${error}`, null);
  }
};
