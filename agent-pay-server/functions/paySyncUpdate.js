/**
 * This is the StatusCallback URL for the Pay API. Once we receive a status callback, we now 
 * update pay Sync map with the data we received.
 * 
 * NOTE: Initially, the data received, will be the Connector data and contain the PKxxx value.
 *
 * {
      "PaymentConnector": "PGP_MOCK",
      "DateCreated": "2021-08-10T03:55:53.408Z",
      "PaymentMethod": "credit-card",
      "CallSid": "CAfc8f6c8101fca0723d77312b81d8e79a",
      "ChargeAmount": "9.99",
      "AccountSid": "ACxxxxx",
      "Sid": "PK248a4899c8e3311dabc8edadfb9aa07e"
    }
 * 
 * 1) Extract PaySID (PKXXX) and set at key for map.
 * 2) Use the received object as map item data.
 * 
 * The next update will be the capture data, replacing the connector data, so use that as the data
 * 
  {
    "SecurityCode": "xxx",
    "PaymentCardType": "visa",
    "Sid": "PK5967a7414bd0566b5fba68d7728e3923",
    "PaymentConfirmationCode": "ch_a9dc6297cd1a4fb095e61b1a9cf2dd1d",
    "CallSid": "CAc99f75b7f210edd87b01577c84655b4a",
    "Result": "success",
    "AccountSid": "AC75xxxxxx",
    "ProfileId": "",
    "DateUpdated": "2021-08-10T03:58:27.290Z",
    "PaymentToken": "",
    "PaymentMethod": "credit-card",
    "PaymentCardNumber": "xxxxxxxxxxxx1111",
    "ExpirationDate": "1225"
  }
 * Process:
 * 1) Assume payMap exists and update the mapItem with the new Pay data.
 * 2) If it fails, SyncMap payMap does not exist, so create it and then add new data
 * 3) Finally, send the Sid as a response
 */
exports.handler = async function (context, event, callback) {

  // CORS handler. Remove on Deployment
  const response = new Twilio.Response();
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
  };
  response.setHeaders(headers);

  const restClient = context.getTwilioClient();

  const createMapItem = async () => {
    await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
      .syncMaps('payMap')
      .syncMapItems
      .create({
        key: event.Sid,
        data: event,
        ttl: 43200  // 12 hours
      });
  }

  try {
    // Since the payMap may not yet exist, we need to update it under a try/catch. If it does not exist, create and then add item
    try {
      // create or update an existing pay SID with data
      await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps('payMap')
        .syncMapItems(event.Sid)
        .update({
          data: event
        });
    } catch (error) {
      // paySyncUpdate Map or Item does not exist, so create it
      try {
        // console.log("Assume paySyncUpdate Map exists, but Item does not exist, so create it");
        await createMapItem();
      } catch (error) {
        // console.log("paySyncUpdate Map does not exist, so create it");
        await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
          .syncMaps
          .create({ uniqueName: 'payMap' });
        // console.log("Now Item does not exist, so create it");
        await createMapItem();
      }
    } finally {
      callback(null, event.Sid);
    }
  } catch (error) {
    callback(`Error with paySyncUpdate: ${error}`, null);
  }
};
