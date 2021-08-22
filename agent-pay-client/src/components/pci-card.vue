<template>
  <h1>Twilio Demo</h1>
  <h2>Agent Assisted Pay</h2>
  <button @click="createPayment()">Start Pay Session</button>
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
        <button class="reset" @click="resetCard()">x</button>
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
        <button class="reset" @click="resetCvc()">x</button>
      </div>
    </div>
    <br />
    <div class="capture_line">
      <label>Expiry Date</label>
      <div class="inputpair">
        <input
          type="text"
          placeholder="MM/YY"
          v-bind:value="formattedDate"
          readonly
        />
        <button class="reset" @click="resetDate()">x</button>
      </div>
    </div>
  </div>

  <div>
    <br />
    <br />
    <button @click="completeSession()">Submit</button>
    <button @click="cancelSession()">Cancel</button>
    <p>Token: {{ cardData.paymentToken }}</p>
  </div>
</template>

<script>
import PayClient from "../sdk/payClient";

export default {
  data() {
    return {
      debug: true,
      panCaptureDone: false,
      cvcCaptureDone: false,
      dateCaptureDone: false,
      GUID: "",
      cardData: {
        paymentCardNumber: "",
        securityCode: "",
        expirationDate: "",
        paymentToken: "",
      },
    };
  },
  methods: {
    async createPayment() {
      // Have to pass in a reference, so the data remains reactive, when it changes
      PayClient.createPayment(this.cardData);
    },

    cancelSession() {
      PayClient.changeSession("cancel");
      if (this.debug) console.log(`Vue Cancel Capture`);
    },

    completeSession() {
      const temp = PayClient.changeSession("complete");
      if (this.debug) console.log(`Vue Complete Capture`);
    },

    resetCard() {
      PayClient.resetCard();
    },
    resetCvc() {
      PayClient.resetCvc();
    },
    resetDate() {
      PayClient.resetDate();
    },
  },
  computed: {
    formattedDate() {
      return (
        this.cardData.expirationDate.substring(0, 2) +
        "/" +
        this.cardData.expirationDate.substring(2, 4)
      );
    },
  },

  mounted() {
    try {
      PayClient.initialise();
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
  padding: 5px 32px;
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
  float: right;
}

.card_capture {
  width: 400px;
  margin: 0 auto 0 auto;
}

.capture_line {
  margin: 2px;
}
</style>
