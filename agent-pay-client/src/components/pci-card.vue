<template>
  <div>
    <h1>Twilio Demo</h1>
    <h2>Agent Assisted Pay</h2>
    <button @click="startCapture()" v-show="callConnected && !capturing">
      Start Pay Session
    </button>
    <br />
    <br />
    <div class="card_capture">
      <div class="capture_line">
        <label>Card Number: ({{ cardData.paymentCardType }})</label>
        <div class="inputpair">
          <input
            type="text"
            placeholder="card number"
            readonly
            v-model="cardData.paymentCardNumber"
          />
          <button class="reset" @click="resetCard()" :disabled="!capturingCard">
            x
          </button>
        </div>
      </div>
      <br />
      <div class="capture_line">
        <label>CVC:</label>
        <div class="inputpair">
          <input
            type="text"
            placeholder="cvc"
            v-model="cardData.securityCode"
            readonly
          />
          <button class="reset" @click="resetCvc()" :disabled="!capturingCvc">
            x
          </button>
        </div>
      </div>
      <br />
      <div class="capture_line">
        <label>Expiry Date</label>
        <div class="inputpair">
          <input
            type="text"
            placeholder="MM/YY"
            v-model="formattedDate"
            readonly
          />
          <button class="reset" @click="resetDate()" :disabled="!capturingDate">
            x
          </button>
        </div>
      </div>
    </div>
    <br />
    <br />
    <div>
      <button @click="submit()" v-show="captureComplete">
        Submit
      </button>
      <button @click="cancel()" v-show="capturing || captureComplete">
        Cancel
      </button>
      <p>Token: {{ cardData.paymentToken }}</p>
    </div>
  </div>
</template>

<script>
import PayClient from "../sdk/AgentAssistPayClient";

export default {
  data() {
    return {
      payClient: null,
      callConnected: false,
      capturing: false,
      capturingCard: false,
      capturingCvc: false,
      capturingDate: false,
      captureComplete: false,

      cardData: {
        paymentCardNumber: "",
        paymentCardType: "",
        securityCode: "",
        expirationDate: "",
        paymentToken: "",
      },
    };
  },
  methods: {
    async startCapture() {
      this.payClient.startCapture();
    },
    cancel() {
      this.payClient.cancelCapture();
      this.cardData.paymentCardNumber = "";
      this.cardData.securityCode = "";
      this.cardData.expirationDate = "";
    },
    submit() {
      this.payClient.submitCapture();
      this.cardData.paymentCardNumber = "";
      this.cardData.securityCode = "";
      this.cardData.expirationDate = "";
    },

    resetCard() {
      this.cardData.paymentCardNumber = "";
      this.payClient.resetCard();
    },
    resetCvc() {
      this.cardData.securityCode = "";
      this.payClient.resetCvc();
    },
    resetDate() {
      this.cardData.expirationDate = "";
      this.payClient.resetDate();
    },
  },
  computed: {
    formattedDate() {
      if (this.cardData.expirationDate) {
        // This is to handle the bug VPAY-832
        return (
          this.cardData.expirationDate.substring(0, 2) +
          "/" +
          this.cardData.expirationDate.substring(2, 4)
        );
      }
    },
  },

  mounted() {
    // Set the Internal Merchant Server URL for config and Access Tokens
    let merchantServerUrl = process.env.VUE_APP_MERCHANT_SERVER_URL;
    let callSid = ""; // This value needs to be provided by contact centre CTI, when calling this page
    this.payClient = new PayClient(merchantServerUrl, "Des", callSid);

    try {
      this.payClient.initialize();

      //Establish the listeners
      this.payClient.on("callConnected", () => {
        this.callConnected = true;
      });

      this.payClient.on("capturing", () => {
        this.capturing = true;
      });

      this.payClient.on("capturingCard", () => {
        this.capturingCard = true;
      });

      this.payClient.on("capturingCvc", () => {
        this.capturingCvc = true;
      });

      this.payClient.on("capturingDate", () => {
        this.capturingDate = true;
      });

      this.payClient.on("captureComplete", () => {
        this.captureComplete = true;
      });

      this.payClient.on("cancelledCapture", () => {
        this.capturing = false;
      });

      this.payClient.on("submitComplete", () => {
        this.capturing = false;
      });

      this.payClient.on("cardUpdate", (data) => {
        this.cardData.paymentCardNumber = data.paymentCardNumber;
        this.cardData.paymentCardType = data.paymentCardType;
        this.cardData.securityCode = data.securityCode;
        this.cardData.expirationDate = data.expirationDate;
        this.cardData.paymentToken = data.paymentToken;
      });
    } catch (error) {
      console.error(`'Mounted Error: ${error})`);
    }
  },
};
</script>

<style>
.tempSID {
  border-style: solid;
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

/* */

label {
  float: left;
}

.inputpair {
  /* float: right; */
  width: 100%;
}

input {
  width: 80%;
}

.card_capture {
  display: inline;
  width: 100%;
  margin: 0 auto 0 auto;
}

.capture_line {
  margin: 2px;
}
</style>
