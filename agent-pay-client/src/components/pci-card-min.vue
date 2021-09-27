<template>
  <div>
    <div class="card_capture">
      <div class="capture_line">
        <div class="inputpair">
          <input
            type="text"
            placeholder="card number"
            readonly
            v-model="cardData.paymentCardNumber"
          />
          <button
            class="reset"
            @click="resetCard()"
            :disabled="!cardData.capturingCard"
          >
            x
          </button>
        </div>
      </div>
      <div class="capture_line">
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
        <div class="inputpair">
          <input
            type="text"
            placeholder="MM/YY"
            v-model="formattedDate"
            readonly
          />
          <button
            class="reset"
            @click="resetDate()"
            :disabled="!cardData.capturingDate"
          >
            x
          </button>
        </div>
      </div>
    </div>
    <div>
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
    // This value needs to be provided by contact centre CTI, when calling this page
    let callSid = ""; //

    try {
      this.payClient = new PayClient(merchantServerUrl, "Des", callSid);
      this.startCapture();

      //Establish the listeners
      this.payClient.on("callConnected", () => {
        this.callConnected = true;
      });

      this.payClient.on("capturing", () => {
        this.capturing = true;
      });

      this.payClient.on("capturingCard", () => {
        this.capturingCard = true;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
      });

      this.payClient.on("capturingSecurityCode", () => {
        this.capturingSecurityCode = true;
        this.capturingCard = false;
        this.capturingDate = false;
      });

      this.payClient.on("capturingDate", () => {
        this.capturingDate = true;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
      });

      this.payClient.on("cardReset", () => {
        this.capturingCard = true;
      });

      this.payClient.on("securityCodeReset", () => {
        this.capturingSecurityCode = true;
      });

      this.payClient.on("dateReset", () => {
        this.capturingDate = true;
      });

      this.payClient.on("captureComplete", () => {
        this.captureComplete = true;
      });

      this.payClient.on("cancelledCapture", () => {
        this.capturing = false;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
        this.captureComplete = false;
      });

      this.payClient.on("submitComplete", () => {
        this.capturing = false;
        this.capturingCard = false;
        this.capturingSecurityCode = false;
        this.capturingDate = false;
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
