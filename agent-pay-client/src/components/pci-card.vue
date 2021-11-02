<template>
  <div class="main-window">
    <h1>Twilio Demo</h1>
    <h2>Agent Assisted Pay</h2>
    <button @click="startCapture()" v-show="callConnected && !capturing">
      Start Pay Session
    </button>
    <br />
    <br />
    <div class="card_capture">
      <div class="capture_line">
        <label class="card-label"
          >Card Number: ({{ cardData.paymentCardType }})</label
        >
        <div class="inputpair">
          <input
            class="card_input"
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
      <div class="capture_line">
        <label class="card-label">Security Code:</label>
        <div class="inputpair">
          <input
            type="text"
            placeholder="Security Code"
            v-model="cardData.securityCode"
            readonly
          />
          <button
            class="reset"
            @click="resetSecurityCode()"
            :disabled="!capturingSecurityCode"
          >
            x
          </button>
        </div>
      </div>
      <div class="capture_line">
        <label class="card-label">Expiry Date</label>
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
import PayClient from "@deshartman/payclient_functions";

export default {
  data() {
    return {
      payClient: null,
      callConnected: false,
      capturing: false,
      capturingCard: false,
      capturingSecurityCode: false,
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
    resetSecurityCode() {
      this.cardData.securityCode = "";
      this.payClient.resetSecurityCode();
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
    // // This value needs to be provided by contact centre CTI, when calling this page
    let callSid = null;

    try {
      this.payClient = new PayClient(merchantServerUrl, "Alice");
      this.payClient.attachPay(callSid);

      // Now hook in all the event listeners for GUI.
      this.payClient.on("callConnected", () => {
        this.callConnected = true;
        console.log(`callConnected: this.callConnected ${this.callConnected}`);
      });

      this.payClient.on("capturing", () => {
        this.capturing = true;
        console.log(`capturing: this.capturing ${this.capturing}`);
      });

      this.payClient.on("capturingCard", () => {
        this.capturingCard = true;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
        // console.log(
        //   `capturingCard: this.capturingCard ${this.capturingCard} this.capturingSecurityCode ${this.capturingSecurityCode} this.capturingDate ${this.capturingDate}`
        // );
      });

      this.payClient.on("capturingSecurityCode", () => {
        this.capturingSecurityCode = true;
        this.capturingCard = false;
        this.capturingDate = false;
        // console.log(
        //   `capturingSecurityCode: this.capturingSecurityCode ${this.capturingSecurityCode} this.capturingCard ${this.capturingCard} this.capturingDate ${this.capturingDate}`
        // );
      });

      this.payClient.on("capturingDate", () => {
        this.capturingDate = true;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
        // console.log(
        //   `capturingDate: this.capturingDate ${this.capturingDate} this.capturingCard ${this.capturingCard} this.capturingSecurityCode ${this.capturingSecurityCode} `
        // );
      });

      this.payClient.on("cardReset", () => {
        this.capturingCard = true;
        console.log(`cardReset: this.capturingCard ${this.capturingCard}`);
      });

      this.payClient.on("securityCodeReset", () => {
        this.capturingSecurityCode = true;
        console.log(
          `securityCodeReset: this.capturingSecurityCode ${this.capturingSecurityCode}`
        );
      });

      this.payClient.on("dateReset", () => {
        this.capturingDate = true;
        console.log(`dateReset: this.capturingDate ${this.capturingDate}`);
      });

      this.payClient.on("captureComplete", () => {
        this.captureComplete = true;
        // console.log(
        //   `captureComplete: this.captureComplete ${this.captureComplete}`
        // );
      });

      this.payClient.on("cancelledCapture", () => {
        this.capturing = false;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
        this.captureComplete = false;
        console.log(
          `cancelledCapture: this.capturing ${this.capturing} this.capturingCard ${this.capturingCard} this.capturingSecurityCode ${this.capturingSecurityCode} this.capturingDate ${this.capturingDate} this.captureComplete ${this.captureComplete}`
        );
      });

      this.payClient.on("submitComplete", () => {
        this.capturing = false;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
        // console.log(
        //   `submitComplete: this.capturing ${this.capturing} this.capturingCard ${this.capturingCard} this.capturingSecurityCode ${this.capturingSecurityCode} this.capturingDate ${this.capturingDate}`
        // );
      });

      this.payClient.on("cardUpdate", (data) => {
        if (this.captureComplete) {
          this.cardData.paymentToken = data.paymentToken;
          this.captureComplete = false;
        } else {
          this.cardData.paymentCardNumber = data.paymentCardNumber;
          this.cardData.paymentCardType = data.paymentCardType;
          this.cardData.securityCode = data.securityCode;
          this.cardData.expirationDate = data.expirationDate;
        }
        //console.log(`cardUpdate: this.captureComplete ${this.captureComplete}`);
      });
    } catch (error) {
      console.error(`'Mounted Error: ${error})`);
    }
  },
};
</script>

<style>
.main-window {
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
