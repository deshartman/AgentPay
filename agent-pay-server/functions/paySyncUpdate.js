/**
 * This is the StatusCallback URL for Pay.
 * Once we receive a status callback, we now update Sync with the data we received
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
 * 
 * statusCallBack receives the following:
 * 
 * 
 */
exports.handler = async function (context, event, callback) {
  //console.log(`event: ${JSON.stringify(event, null, 4)}`);

  function sendResponse(data) {
    const response = new Twilio.Response();
    response.appendHeader("Access-Control-Allow-Origin", "*");
    response.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    response.appendHeader("Content-Type", "application/json");
    response.setBody(data);
    return response;
  }

  const restClient = context.getTwilioClient();

  console.log(`paySyncUpdate event: ${JSON.stringify(event, null, 4)}`);

  try {
    // create or update an existing pay SID with data
    try {
      const paySyncMapItem = await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps('payMap')
        .syncMapItems(event.Sid)
        .fetch();


      await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps('payMap')
        .syncMapItems(event.Sid)
        .update({
          data: event
        });
    } catch (error) {
      // Does not exist, so create
      console.log(`creating paySyncMapItem`);
      await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps('payMap')
        .syncMapItems
        .create({
          key: event.Sid,
          data: event,
          ttl: 43200  // 12 hours
        });
    }
    callback(null, sendResponse(event.Sid));
  } catch (error) {
    callback(error, null);
  }
};
