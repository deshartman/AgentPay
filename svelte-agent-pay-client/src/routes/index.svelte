<script>
  import { onMount, onDestroy } from "svelte";
  //import { variables } from "$lib/variables";
  import PayClient from "$lib/AgentAssistPayClient";

  // Set the Agent variable. These are passed to the Agent screen, so this is a temp POC
  let functionsURL = import.meta.env.VITE_FUNCTIONS_URL;
  let identity = "Alice";
  let paymentConnector = import.meta.env.VITE_PAYMENT_CONNECTOR;
  let captureOrder = import.meta.env.VITE_CAPTURE_ORDER;
  let currency = import.meta.env.VITE_CURRENCY;
  let tokenType = import.meta.env.VITE_TOKEN_TYPE;
  let writeKey = import.meta.env.VITE_SEGMENT_WRITEKEY;

  let payClient = null;
  let callConnected = false;
  let capturing = false;
  let capturingCard = false;
  let capturingSecurityCode = false;
  let capturingDate = false;
  let captureComplete = false;
  // This value needs to be provided by contact centre CTI, when calling this page
  let callSid = null;

  let cardData = {
    paymentCardNumber: "",
    paymentCardType: "",
    securityCode: "",
    expirationDate: "",
    paymentToken: "",
    profileId: "",
  };

  //const secret1 = import.meta.env.VITE_CURRENCY;

  // --------------------------------------------------
  // Reactive Variables
  // --------------------------------------------------
  $: formattedDate = cardData.expirationDate.substring(0, 2) + "/" + cardData.expirationDate.substring(2, 4) || "YY"; // This is to handle the bug VPAY-832

  // --------------------------------------------------
  // Methods
  // --------------------------------------------------
  const startCapture = async () => {
    payClient.startCapture();
  };

  const cancel = () => {
    payClient.cancelCapture();
    cardData.paymentCardNumber = "";
    cardData.securityCode = "";
    cardData.expirationDate = "";
  };
  const submit = () => {
    payClient.submitCapture();
    cardData.paymentCardNumber = "";
    cardData.securityCode = "";
    cardData.expirationDate = "";
  };

  const resetCard = () => {
    cardData.paymentCardNumber = "";
    payClient.resetCard();
  };

  const resetSecurityCode = () => {
    cardData.securityCode = "";
    payClient.resetSecurityCode();
  };
  const resetDate = () => {
    cardData.expirationDate = "";
    payClient.resetDate();
  };

  // --------------------------------------------------
  // Mounting
  // --------------------------------------------------
  onMount(async () => {
    try {
      //console.log(`Vue: writeKey: ${writeKey}`);

      payClient = new PayClient(functionsURL, identity, paymentConnector, captureOrder, currency, tokenType, writeKey);

      payClient.attachPay(callSid);

      // Now hook in all the event listeners for GUI.
      payClient.on("callConnected", () => {
        callConnected = true;
        //console.log(`callConnected: callConnected ${callConnected}`);
      });

      payClient.on("capturing", () => {
        capturing = true;
        //console.log(`capturing: capturing ${capturing}`);
      });

      payClient.on("capturingCard", () => {
        capturingCard = true;
        capturingSecurityCode = false;
        capturingDate = false;
        // console.log(
        //   `capturingCard: capturingCard ${capturingCard} capturingSecurityCode ${capturingSecurityCode} capturingDate ${capturingDate}`
        // );
      });

      payClient.on("capturingSecurityCode", () => {
        capturingSecurityCode = true;
        capturingCard = false;
        capturingDate = false;
        // console.log(
        //   `capturingSecurityCode: capturingSecurityCode ${capturingSecurityCode} capturingCard ${capturingCard} capturingDate ${capturingDate}`
        // );
      });

      payClient.on("capturingDate", () => {
        capturingDate = true;
        capturingCard = false;
        capturingSecurityCode = false;
        // console.log(
        //   `capturingDate: capturingDate ${capturingDate} capturingCard ${capturingCard} capturingSecurityCode ${capturingSecurityCode} `
        // );
      });

      payClient.on("cardReset", () => {
        capturingCard = true;
        console.log(`cardReset: capturingCard ${capturingCard}`);
      });

      payClient.on("securityCodeReset", () => {
        capturingSecurityCode = true;
        // console.log(
        //   `securityCodeReset: capturingSecurityCode ${capturingSecurityCode}`
        // );
      });

      payClient.on("dateReset", () => {
        capturingDate = true;
        // console.log(`dateReset: capturingDate ${capturingDate}`);
      });

      payClient.on("captureComplete", () => {
        captureComplete = true;
        // console.log(
        //   `captureComplete: captureComplete ${captureComplete}`
        // );
      });

      payClient.on("cancelledCapture", () => {
        capturing = false;
        capturingCard = false;
        capturingSecurityCode = false;
        capturingDate = false;
        captureComplete = false;
        // console.log(
        //   `cancelledCapture: capturing ${capturing} capturingCard ${capturingCard} capturingSecurityCode ${capturingSecurityCode} capturingDate ${capturingDate} captureComplete ${captureComplete}`
        // );
      });

      payClient.on("submitComplete", () => {
        capturing = false;
        capturingCard = false;
        capturingSecurityCode = false;
        capturingDate = false;
        // console.log(
        //   `submitComplete: capturing ${capturing} capturingCard ${capturingCard} capturingSecurityCode ${capturingSecurityCode} capturingDate ${capturingDate}`
        // );
      });

      /**
       * This is the event that is fired when the user has entered the card details.
       * This is the object returned from the PayClient, with some fields being transient.
       * {
            "SecurityCode": "xxx",
            "PaymentCardType": "visa",
            "Sid": "PK450203affba21dd1e155cd7a8905dae3",
            "PaymentConfirmationCode": "",
            "CallSid": "CAd40633c3d082edaf62987f940aa641f4",
            "Result": "success",
            "AccountSid": "AC75ca6789a296a3f86c54367a0dc5a11a",
            "ProfileId": "7e6a1fc3-4456-4141-8658-378297a06476",
            "DateUpdated": "2021-12-15T23:18:05.064Z",
            "PaymentToken": "hgyvy76",
            "PaymentMethod": "credit-card",
            "PaymentCardNumber": "xxxxxxxxxxxx1111",
            "ExpirationDate": "1225"
          }
       */
      payClient.on("cardUpdate", (data) => {
        // console.log(`Vue cardUpdate: data ${JSON.stringify(data, null, 4)}`);

        if (captureComplete) {
          cardData.paymentToken = data.PaymentToken;
          cardData.profileId = data.ProfileId;
          captureComplete = false;
        } else {
          cardData.paymentCardNumber = data.PaymentCardNumber;
          cardData.paymentCardType = data.PaymentCardType;
          cardData.securityCode = data.SecurityCode;
          cardData.expirationDate = data.ExpirationDate;
        }
      });
    } catch (error) {
      console.error(`'Mounted Error: ${error})`);
    }
  });

  // --------------------------------------------------
  // UnMounting
  // --------------------------------------------------
  onDestroy(() => {
    console.log("Unmounting");

    if (payClient) {
      payClient.detachPay();
      payClient.removeAllListeners([
        "callConnected",
        "capturing",
        "capturingCard",
        "capturingSecurityCode",
        "capturingDate",
        "cardReset",
        "securityCodeReset",
        "dateReset",
        "captureComplete",
        "cancelledCapture",
        "submitComplete",
        "cardUpdate",
      ]);
    }
  });
</script>

<main>
  <h1>Twilio Demo</h1>
  <h2>Agent Assisted Pay</h2>

  <!-- <button on:click={startCapture} disabled={!callConnected && !capturing}> Start Pay Session </button> -->

  {#if callConnected && !capturing}
    <button on:click={startCapture}>Start Pay Session</button>
  {/if}

  <br />
  <br />
  <div class="card_capture">
    <div class="capture_line">
      <label class="card-label">Card Number: ({cardData.paymentCardType})</label>
      <div class="inputpair">
        <input
          class="card_input"
          type="text"
          placeholder="card number"
          readonly
          bind:value={cardData.paymentCardNumber}
        />

        <button class="reset" on:click={resetCard} disabled={!capturingCard}>x</button>
      </div>
    </div>
    <div class="capture_line">
      <label class="card-label">Security Code:</label>
      <div class="inputpair">
        <input type="text" placeholder="Security Code" bind:value={cardData.securityCode} readonly />

        <button class="reset" on:click={resetSecurityCode} disabled={!capturingSecurityCode}>x</button>
      </div>
    </div>
    <div class="capture_line">
      <label class="card-label">Expiry Date</label>
      <div class="inputpair">
        <input type="text" placeholder="MM/YY" bind:value={formattedDate} readonly />

        <button class="reset" on:click={resetDate} disabled={!capturingDate}>x</button>
      </div>
    </div>
  </div>
  <br />
  <br />
  <div>
    {#if captureComplete}
      <button on:click={submit}>Submit</button>
    {/if}
    {#if capturing || captureComplete}
      <button on:click={cancel}>Cancel</button>
    {/if}
    <p>ProfileId: {cardData.profileId}</p>
    <br />
    <p>Token: {cardData.paymentToken}</p>
  </div>
</main>

<style>
  main {
    text-align: center;
  }

  .card_capture {
    margin: 0 auto 0 auto;
  }

  .capture_line {
    margin: 3px;
  }

  .card-label {
    text-align: left;
    float: left;
    width: 140px;
  }

  .inputpair {
    display: inline;
  }

  .card_input {
    display: inline;
  }

  button {
    background-color: red;
    color: white;
    padding: 5px 20px;
    margin: 10px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
  }

  .reset {
    background-color: grey;
    padding: 0px 10px;
    margin: 0px;
  }
</style>
