<script>
  import { onMount, onDestroy } from "svelte";
  //import { variables } from "$lib/variables";
  import PayClient from "@deshartman/agent-pay";
  import SessionStore from "../stores/SessionStore";
  import ProtectedLayout from "../libs/ProtectedLayout.svelte";

  // Set the Agent variable. These are passed to the Agent screen, so this is a temp POC
  let functionsURL = import.meta.env.VITE_FUNCTIONS_URL;

  let identity = $SessionStore.identity;
  let bearer = $SessionStore.bearer;
  console.log("store updated", identity, bearer);

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
  let formattedCard;
  let formattedDate;
  let formattedSecurity;

  let cardData = {
    paymentCardNumber: "",
    paymentCardType: "",
    securityCode: "",
    expirationDate: "",
    paymentToken: "",
    profileId: "",
  };

  // --------------------------------------------------
  // Reactive Variables
  // --------------------------------------------------
  $: if (cardData.paymentCardType) {
    formattedCard = cardData.paymentCardNumber + " (" + cardData.paymentCardType + ")";
  } else {
    if (cardData.paymentCardNumber) {
      formattedCard = cardData.paymentCardNumber;
    } else {
      formattedCard = "Card Number";
    }
  }

  $: if (cardData.expirationDate) {
    formattedDate = cardData.expirationDate.substring(0, 2) + "/" + cardData.expirationDate.substring(2, 4) || "YY"; // This is to handle the bug VPAY-832
  } else {
    formattedDate = "MM/YY";
  }

  $: if (cardData.securityCode) {
    formattedSecurity = cardData.securityCode;
  } else {
    formattedSecurity = "Security Code";
  }

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
      //console.log(`onMount: ${bearer}`);

      payClient = new PayClient(
        functionsURL,
        identity,
        bearer,
        paymentConnector,
        captureOrder,
        currency,
        tokenType,
        writeKey
      );

      payClient.attachPay(callSid);

      //------------------------------------------------------
      // Get the call SID from Sync - TEMP Hack for Demo
      //------------------------------------------------------
      payClient.on("UUIItemAdded", (callSid) => {
        callConnected = true;
        console.log(`UUIItemAdded: Call SID: ${callSid} `);
      });

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

<ProtectedLayout>
  <header>
    <h1>Twilio Demo</h1>
    <h2>Agent Assisted Pay</h2>
  </header>

  <main>
    {#if callConnected && !capturing}{/if}
    <div class="start-btn">
      <button on:click={startCapture}>Start Pay Session</button>
    </div>

    <div class="card_capture">
      <div class="capture_line">
        <label class="card-item">Card Number: </label>
        <label class="card-data">{formattedCard}</label>
        <button class="reset" on:click={resetCard} disabled={!capturingCard}>x</button>
        <!-- <label class="card-type"> (Mastercard{cardData.paymentCardType})</label> -->
      </div>

      <div class="capture_line">
        <label class="card-item">Security Code: </label>
        <label class="security-data">{formattedSecurity}</label>
        <button class="reset" on:click={resetSecurityCode} disabled={!capturingSecurityCode}>x</button>
      </div>

      <div class="capture_line">
        <label class="card-item">Expiry Date: </label>
        <label class="date-data">{formattedDate}</label>
        <button class="reset" on:click={resetDate} disabled={!capturingDate}>x</button>
      </div>

      <!-- <div class="capture_line">
        <span class="card-label">Card Number:</span>
        <div class="inputpair">
          <input type="text" placeholder="card number" readonly bind:value={cardData.paymentCardNumber} />
          <button class="reset" on:click={resetCard} disabled={!capturingCard}>x</button>
        </div>
        <p class="card-type">({cardData.paymentCardType})</p>
      </div>
      <div class="capture_line">
        <span class="card-label">Security Code:</span>
        <div class="inputpair">
          <input type="text" placeholder="Security Code" bind:value={cardData.securityCode} readonly />
          <button class="reset" on:click={resetSecurityCode} disabled={!capturingSecurityCode}>x</button>
        </div>
      </div>
      <div class="capture_line">
        <span class="card-label">Expiry Date:</span>
        <div class="inputpair">
          <input type="text" placeholder="MM/YY" bind:value={formattedDate} readonly />
          <button class="reset" on:click={resetDate} disabled={!capturingDate}>x</button>
        </div>
      </div>
    </div> -->

      <div class="action-btn">
        {#if captureComplete}{/if}
        <button on:click={submit}>Submit</button>
        {#if capturing || captureComplete}{/if}
        <button on:click={cancel}>Cancel</button>
      </div>

      <hr />
      <footer>
        <textarea>{JSON.stringify(cardData, null, 4)}</textarea>
        <!-- <p>ProfileId: {cardData.profileId}</p>
        <p>Token: {cardData.paymentToken}</p> -->
      </footer>
    </div>
  </main>
</ProtectedLayout>

<style>
  header {
    text-align: center;
  }

  .card_capture {
    /* text-align: center; */
  }
  .card-item {
    display: inline-block;
    height: 20px;
    width: 100px;
  }

  .card-data,
  .security-data,
  .date-data {
    display: inline-block;
    height: 20px;
    width: 200px;
    border-style: solid;
    border-color: lightgray;
    color: rgb(114, 114, 114);
    text-align: left;
  }

  .card-type {
    display: inline-block;
    height: 20px;
    width: 86px;
  }

  main {
    max-width: 100%;
    width: 500px;
    margin: 40px auto;
    padding: 20px 40px;
    box-sizing: border-box;
    border-style: solid;
    border-color: lightgray;
  }

  .capture_line {
    margin: 5px;
  }
  .card-label {
    display: inline-block;
    width: 150px;
    text-align: right;
  }
  .inputpair {
    display: inline-block;
  }
  .card_input {
    /* display: inline; */
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

  .card-type {
    display: inline-block;
  }

  p {
    margin: 5px;
  }

  .action-btn {
    display: flex;
    justify-content: center;
  }
  .start-btn {
    display: flex;
    justify-content: center;
  }
  textarea {
    width: 400px;
    height: 200px;
  }
</style>
