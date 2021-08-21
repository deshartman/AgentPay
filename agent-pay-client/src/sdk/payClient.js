/**
 * This will eventually be converted into an SDK similar to all the other SDKs and we will need to use
 * access tokens as with other SDKs
 */

/**
 * This is a direct client implementation. It is also possible to use a Node server to initiate the 
 * Twilio API calls and this file only to handle the browser logic to call the node server. This means 
 * that the browser client needs to know the Twilio creds, which is not ideal. This is for prototyping
 * only!
 * 
 */
import axios from "axios";
import SyncClient from "twilio-sync";

const PayClient = {
    version: "v2",
    _debug: true, // logs verbosely to console

    // Sync variables
    _syncClient: null,
    _guidMap: null,
    _payMap: null,
    _token: "",
    identity: "alice",

    // Payment Variables

    _callSID: '',
    _paySID: '',
    _cardData: {},
    _capture: "",
    _partialResult: true,
    _required: "",

    // Axios setup for Twilio API calls directly from the client
    _axios_twilio: axios.create({
        baseURL:
            process.env.VUE_APP_TWILIO_URL + "/" + process.env.VUE_APP_ACCOUNT_SID, //This allows us to change the rest of the URL
        auth: {
            // Basic Auth only
            username: process.env.VUE_APP_ACCOUNT_SID,
            password: process.env.VUE_APP_AUTH_TOKEN,
        },
        headers: {
            "Content-Type": "application/x-www-form-urlencoded", // _Required for Twilio API
        },
        timeout: 5000,
    }),

    captureOrder: [],
    statusCallback: 'https://agent-pay-3089-dev.twil.io/pay/paySyncUpdate', // TODO: incorporate the URL in the SDK launch process.env.VUE_APP_STATUS_CALLBACK + "/pay/paySyncUpdate",

    ///////////////////////////////////////////////////////////////////////////////////

    // OBJECT METHODS
    async getSyncToken() {
        let url = process.env.VUE_APP_MERCHANT_SERVER_URL + "/sync-token"; //+ "?identity=" + this.identity; TODO: strap in Vue Identity to pass to server
        try {
            let result = await axios.get(url);
            console.log(`Identity: ${result.data.identity} & Token: ${result.data.token}`);
            this.identity = result.data.identity;
            this._token = result.data.token;
        } catch (error) {
            console.error(`getting token error: ${error}`);
        }
    },

    /**
     * This method straps up all the parts we need for the Sync and payment components. Process is:
     * 1) get Sync Token
     * 2) Initialise Sync maps
    */
    async initialise() {
        await this.getSyncToken();

        try {
            //console.log(`Setting up Sync`);
            this._syncClient = new SyncClient(this._token, {});
            //console.log(`Connecting to Maps`);
            this._guidMap = await this._syncClient.map('guidMap');
            this._payMap = await this._syncClient.map('payMap');

            //console.log(`Set up listeners for Pay Map changes`);
            this._guidMap.on('itemAdded', (args) => {
                console.log(`_guidMap item ${args.item.key} was added`);

                // TODO: Temporary hack to automatically grab the Call SID. This would normally be done by CTI
                this._callSID = args.item.data.SID;
                console.log(`Call SID is = ${this._callSID}`);
            });

            // this._payMap.on('itemAdded', (args) => {
            //     console.log(`_payMap item ${args.item.key} was ADDED`);
            //     //console.log('args.item.data:', args.item.data);
            // });

            // Add Event Listener for data changes. Update the _cardData object
            this._payMap.on('itemUpdated', (args) => {
                console.log(`_payMap item ${args.item.key} was UPDATED`);
                //console.log('args.item.data:', args.item.data);

                // Update the local variables:
                this._cardData.paymentCardNumber = args.item.data.PaymentCardNumber;
                this._cardData.securityCode = args.item.data.SecurityCode;
                this._cardData.expirationDate = args.item.data.ExpirationDate;
                this._cardData.paymentToken = args.item.data.PaymentToken;
                this._cardData.paymentCardType = args.item.data.PaymentCardType;
                this._capture = args.item.data.Capture;
                this._partialResult = args.item.data.PartialResult;
                this._required = args.item.data.Required;
                // TODO: Change the Vue object passed in to be the raw .data object, so we can assign in a single line
                // Vue can pick the values to display.

                this._checkPayProgress();
            });
        } catch (error) {
            console.error(`Could not Initialise. Error setting up Sync ${error}`);
        }
    },

    ///////////         PAY         ///////////
    async createPayment(cardData) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments.json
        let theUrl = '/Calls/' + this._callSID + '/Payments.json';
        this._cardData = cardData;

        this.captureOrder = [
            "payment-card-number",
            "security-code",
            "expiration-date",
        ];

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('IdempotencyKey', Date.now().toString());
        urlEncodedData.append('StatusCallback', this.statusCallback);
        urlEncodedData.append('ChargeAmount', '0');
        urlEncodedData.append('tokenType', 'reusable');
        urlEncodedData.append('Currency', 'AUD');
        urlEncodedData.append('PaymentConnector', 'Braintree_Connector');
        urlEncodedData.append('PostalCode', false);

        try {
            const response = await this._axios_twilio.post(theUrl, urlEncodedData);
            this._paySID = response.data.sid;
            await this.updateCaptureType();
        } catch (error) {
            if (this._debug) console.error(error);
        }
    },

    /**
     * Initiates and stops polling for the _capture
     * Progresses through the _required information as per the API update _required fields
     */
    async _checkPayProgress() {
        if (this._capture) {
            console.log(`this._capture: ${this._capture}`);
            if (this._required.includes(this.captureOrder[0])) {
                // continue _capture
                console.log(`Still capturing currentCaptureType: [${this.captureOrder[0]}]`);
            } else {
                // move to next Capture Type in the list
                if (this._required.length > 0) {
                    // Remove the current (first) item in capture Order Array
                    this.captureOrder.shift();
                    console.log(`changing this.captureOrder[0]: ${this.captureOrder[0]}`);
                    this.updateCaptureType();
                } else {
                    // Stop polling
                    console.log(`Stopping polling`);
                }
            }
        } else {
            //console.log(`Not in _capture mode, keep polling. _capture: [${this._capture}] & current Capture Type: [${this.captureOrder[0]}]`);
        }
    },

    // Change what is being captured
    async updateCaptureType() {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this._callSID + '/Payments/' + this._paySID + '.json';

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Capture', this.captureOrder[0]);
        urlEncodedData.append('IdempotencyKey', Date.now().toString());
        urlEncodedData.append('StatusCallback', this.statusCallback);

        try {
            const response = await this._axios_twilio.post(theUrl, urlEncodedData);
            console.log(`Capturing ${this.captureOrder[0]} now..............`);
        } catch (error) {
            if (this._debug) console.error(error);
        }
    },

    // Change the Pay session; Cancel or Complete
    async changeSession(changeType) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this._callSID + '/Payments/' + this._paySID + '.json';

        console.log(`changeSession ChangeType: ${changeType}`);
        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Status', changeType);
        urlEncodedData.append('IdempotencyKey', Date.now().toString());
        urlEncodedData.append('StatusCallback', this.statusCallback);

        try {
            const response = await this._axios_twilio.post(theUrl, urlEncodedData);
            if (this._debug) console.log(`changeSession Response data: ${JSON.stringify(response.data)}`);
            //return response.data.sid;
        } catch (error) {
            if (this._debug) console.error(error);
        }
    },

    resetCard() {
        this.updateCaptureType();
        this._cardData.paymentCardNumber = "";
    },
    resetCvc() {
        this.updateCaptureType();
        this._cardData.securityCode = "";
    },
    resetDate() {
        this.updateCaptureType();
        this._cardData.expirationDate = "";
    },
};

export default PayClient;