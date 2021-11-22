/**
 * Returns a call SID for a UUI passed as a event parameter. Returns null if not found
 * Assumption is that a call has been established using a passed uui
 */

exports.handler = async function (context, event, callback) {

  const restClient = context.getTwilioClient();

  try {
    const syncMapItem = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
      .syncMaps('uuiMap')
      .syncMapItems(event.uui)
      .fetch();

    callback(null, {
      data: syncMapItem.data,
      dateExpires: syncMapItem.dateExpires
    });
  } catch (error) {
    callback(error, null);
  }

};
