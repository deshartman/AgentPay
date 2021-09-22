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
//import twilio from "twilio";
import AccessToken from "twilio/lib/jwt/AccessToken";
import axios from "axios";
import SyncClient from "twilio-sync";

const PayClient = {
    version: "v0.2",

    // Sync variables
    _syncClient: null,
    _payMap: null,
    _payMapItemKey: null,
    _syncToken: "",
    identity: "alice",

    // Payment Variables

    _callSID: '',
    _paySID: '',
    _cardData: {},
    _capture: "",
    _partialResult: true,
    _required: "",

    // Axios setup for Twilio API calls directly from the client
    _twilioAPI: null,
    _statusCallback: '',

    captureOrder: [],
    _captureOrderTemplate: [],
    payConnector: '',
    currency: 'USD',
    tokenType: 'reusable',

    /////////////////////////////////////// OBJECT METHODS //////////////////////////////////////////////


    // Gets the configuration from the MErchant server to set up Agent Pay
    //
    async _getConfig(url) {
        // Grab config from the Merchant Server
        try {
            const config = await axios.get(url);
            //console.log(`the config: ${JSON.stringify(config.data, null, 4)}`);

            const axios_config = {
                baseURL:
                    'https://api.twilio.com/2010-04-01/Accounts/' + config.data.twilioAccountSid, //This allows us to change the rest of the URL
                auth: {
                    // Basic Auth using API key
                    username: config.data.twilioApiKey,
                    password: config.data.twilioApiSecret
                },
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded", // _Required for Twilio API
                },
                timeout: 5000,
            };
            //console.log('Axios config' + JSON.stringify(axios_config, null, 4));
            // Update Axios and status call back
            this._twilioAPI = axios.create(axios_config);
            this._statusCallback = config.data.functionsURL + '/paySyncUpdate';
            this.payConnector = config.data.payConnector;
            console.log(`this.payConnector: ${this.payConnector}`);
            this._captureOrderTemplate = config.data.captureOrder.slice(); // copy by value
            this.captureOrder = config.data.captureOrder.slice(); // copy by value TODO: Can probably remove this, since CaptureToken sets it anyway
            this.currency = config.data.currency;
            this.tokenType = config.data.tokenType;
            this.identity = config.data.identity;

            try {
                console.log(`Getting sync-token`);
                const SyncGrant = AccessToken.SyncGrant;
                const syncGrant = new SyncGrant({
                    serviceSid: config.data.paySyncSid
                });

                // Create an access token which we will sign and return to the client,
                // containing the grant we just created
                const accessToken = new AccessToken(
                    config.data.twilioAccountSid,
                    config.data.twilioApiKey,
                    config.data.twilioApiSecret,
                    { identity: config.data.identity }
                );

                accessToken.addGrant(syncGrant);
                this._syncToken = accessToken.toJwt();
                //console.log(`sync-token: ${this._syncToken}`);
            } catch (error) {
                console.error(`Error getting sync token: ${error}`);
            }
        } catch (error) {
            console.error(`Error getting config from Merchant Server: ${error}`);
        }
    },


    /**
     * Initialise the Agent Assisted Pay Session by getting the configuration parameters from the Merchant server
     * The Merchant server will provide the parameters in the following object format:
       {       
            twilioAccountSid: twilioAccountSid,
            twilioApiKey: twilioApiKey,
            twilioApiSecret: twilioApiSecret,
            functionsURL: functionsURL,     // The Twilio Functions URL where the call handlers are deployed
            payConnector: payConnector,         // The name of the Twilio Pay connector configured
            captureOrder: [                     // The order in which the components will be captured
                "payment-card-number",
                "security-code",
                "expiration-date" ],
            currency: 'AUD',
            tokenType: 'reusable',              // Token type: "once off" or "reusable"
            identity: identity,                 // Identity of the Agent for the session
        }
     * 
     * @param {URL: String} merchantServerUrl
     * @param { paymentCardNumber: String, securityCode: String, expirationDate: String, paymentToken: String, capturing: boolean, capturingCard: boolean, capturingCvc: boolean, capturingDate: boolean, captureComplete: boolean } cardData
     * @param {callSid: String} callSid
     *
    */
    async initialize(merchantServerUrl, cardData, callSid = null) {

        this._cardData = cardData;

        try {
            await this._getConfig(merchantServerUrl + '/getConfig');

            //console.log(`Setting up Sync`);
            this._syncClient = new SyncClient(this._syncToken, {});
            this._payMap = await this._syncClient.map('payMap');

            // If a Call SID was passed in, CTI has call already and now opening view
            if (callSid) {
                this._callSID = callSid;
                console.log(`Initialize with a CTI callSid: ${this._callSID}`);
                // Update View elements
                this._cardData.callConnected = true;
                this._cardData.capturing = false;
                this._cardData.captureComplete = false;
                console.log(`Initialize. this._cardData.capturing = ${this._cardData.capturing}`);
                // Now initialise the capture
                this.captureToken();
            } else {
                // View opened with no call, so cannot determine the Call SID
                console.log(`Cannot determine the Call SID. Please place a call or initiate the app with a call SID`);
                this._cardData.callConnected = false;
                this._cardData.capturing = false;
                this._cardData.captureComplete = false;

                ////////////////////////////////////////////// REMOVE WHEN USING CTI ///////////////////////////////////////////////////
                //////// TODO: Temporary hack to automatically grab the Call SID. This would normally be done by CTI or Flex ///////////
                const guidMap = await this._syncClient.map('guidMap');
                guidMap.on('itemAdded', (args) => {
                    this._callSID = args.item.data.SID;
                    console.log(`Call SID is = ${this._callSID}`);
                    //console.log(`Initialise. TEMP HACK this._cardData.capturing = ${this._cardData.capturing}`);
                    this._cardData.callConnected = true;
                    this._cardData.capturing = false;
                    this._cardData.captureComplete = false;

                    // Now initialise the capture
                    this.captureToken();
                });
                /////////////////////////////////////////////////////////////////////////////////////////////////////////
            }

            // Add Event Listener for data changes. Update the _cardData object
            this._payMap.on('itemUpdated', (args) => {
                //console.log(`_payMap item ${JSON.stringify(args, null, 4)} was UPDATED`);
                // Update the local variables:
                this._payMapItemKey = args.item.key;
                this._cardData.paymentCardNumber = args.item.data.PaymentCardNumber;
                this._cardData.securityCode = args.item.data.SecurityCode;
                this._cardData.expirationDate = args.item.data.ExpirationDate;
                this._cardData.paymentToken = args.item.data.PaymentToken;
                this._cardData.paymentCardType = args.item.data.PaymentCardType;
                this._capture = args.item.data.Capture;
                this._partialResult = args.item.data.PartialResult;
                this._required = args.item.data.Required;

                // Check if we need to move to next capture item
                this._checkPayProgress();
            });
        } catch (error) {
            console.error(`Could not Initialize. Error setting up Pay Session with Error: ${error}`);
        }
    },

    /**
     * This allows a PBX CTI to update the call SID at any point.
     * 
     * @param {String} callSid 
     */
    updateCallSid(callSid) {
        this._callSID = callSid;
        //this._cardData.capturing = true;
        this._cardData.callConnected = true;
    },

    /**
     * This will set up a Agent Assisted Pay session based on the Call SID
     * 
     * @param { paymentCardNumber: String, securityCode: String, expirationDate: String, paymentToken: String, capturing: boolean, capturingCard: boolean, capturingCvc: boolean, capturingDate: boolean, captureComplete: boolean } cardData
     * 
     * The cardData object is expected to be reactive and will be updated from here.
     * Status callbacks will be sent to the Functions function defined in StatusCallback
     * 
     * This attaches a Payment on the Twilio call with CallSID.
     * 
     */
    async captureToken() { //cardData) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments.json
        let theUrl = '/Calls/' + this._callSID + '/Payments.json';
        console.log(`captureToken url: [${theUrl}]`);
        //this._cardData = cardData;
        this.captureOrder = this._captureOrderTemplate.slice(); // Copy value

        //console.log(`Capture order: ${this.captureOrder} vs ${this._captureOrderTemplate}`);

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('IdempotencyKey', this.identity + Date.now().toString());
        urlEncodedData.append('StatusCallback', this._statusCallback);
        urlEncodedData.append('ChargeAmount', '0');
        urlEncodedData.append('TokenType', this.tokenType);
        urlEncodedData.append('Currency', this.currency);
        urlEncodedData.append('PaymentConnector', this.payConnector);
        urlEncodedData.append('SecurityCode', this.captureOrder.includes('security-code')); // set flag based on contents of captureOrder array
        urlEncodedData.append('PostalCode', this.captureOrder.includes('postal-code')); // set flag based on contents of captureOrder array

        try {
            const response = await this._twilioAPI.post(theUrl, urlEncodedData);
            this._paySID = response.data.sid;
            // Update visual flags
            this._cardData.capturing = true;
            this._cardData.capturingCard = false;
            this._cardData.capturingCvc = false;
            this._cardData.capturingDate = false;
            this._cardData.captureComplete = false;

            await this._updateCaptureType(this.captureOrder[0]);
        } catch (error) {
            console.error(`Error with Capture Token: ${error}`);
        }
    },

    // Initiates and stops polling for the _capture
    // Progresses through the _required information as per the API update _required fields
    //async 
    _checkPayProgress() {
        if (this._capture) {
            // console.log(`this._capture: ${this._capture}`);
            // console.log(`this._required ${this._required}`);
            // console.log(`this.captureOrder ${this.captureOrder}`);

            if (this._required.includes(this.captureOrder[0])) {
                // continue _capture
                console.log(`Capturing: [${this.captureOrder[0]}]`);
            } else {
                // move to next Capture Type in the list
                if (this._required.length > 0) {
                    // Remove the current (first) item in capture Order Array
                    this.captureOrder.shift();
                    console.log(`Changing to: ${this.captureOrder[0]}`);
                    this._updateCaptureType(this.captureOrder[0]);
                } else {
                    // Stop polling
                    console.log(`Stopping Capture`);
                    this._cardData.captureComplete = true;
                    this.submitCapture();
                }
            }
        } else {
            //console.log(`Not in _capture mode, keep polling. _capture: [${this._capture}] & current Capture Type: [${this.captureOrder[0]}]`);
        }
    },

    // Change what is being captured and update visual indicators
    async _updateCaptureType(captureType) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this._callSID + '/Payments/' + this._paySID + '.json';

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Capture', captureType);
        urlEncodedData.append('IdempotencyKey', this.identity + Date.now().toString());
        urlEncodedData.append('StatusCallback', this._statusCallback);

        try {
            const response = await this._twilioAPI.post(theUrl, urlEncodedData);
            console.log(`Capturing ${captureType} now..............`);
            switch (captureType) {
                case "payment-card-number":
                    this._cardData.capturingCard = true;
                    this._cardData.capturingCvc = false;
                    this._cardData.capturingDate = false;
                    break;
                case "security-code":
                    this._cardData.capturingCard = false;
                    this._cardData.capturingCvc = true;
                    this._cardData.capturingDate = false;
                    break;
                case "expiration-date":
                    this._cardData.capturingCard = false;
                    this._cardData.capturingCvc = false;
                    this._cardData.capturingDate = true;
                    break;
            }
        } catch (error) {
            console.error(`Could not update CaptureType to ${captureType} with Error: ${error}`);
        }
    },


    /**
     * Reset the card Number captured.
     */
    resetCard() {
        this._cardData.paymentCardNumber = "";
        if (this.captureOrder[0] === "payment-card-number") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("payment-card-number");
        }
        this._updateCaptureType(this.captureOrder[0]);
    },

    /**
     * Reset the card CVC captured.
     */
    resetCvc() {
        this._cardData.securityCode = "";
        if (this.captureOrder[0] === "security-code") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("security-code");
        }
        this._updateCaptureType(this.captureOrder[0]);
    },

    /**
     * Reset the card Exp. Date captured.
     */
    resetDate() {
        this._cardData.expirationDate = "";
        if (this.captureOrder[0] === "expiration-date") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("expiration-date");
        }
        this._updateCaptureType(this.captureOrder[0]);
    },

    // Change the Pay session; Cancel or Complete
    async _changeSession(changeType) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this._callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this._callSID + '/Payments/' + this._paySID + '.json';

        //console.log(`_changeSession ChangeType: ${changeType}`);

        // Reset the Capture Order
        this.captureOrder = this._captureOrderTemplate.slice(); // copy by value to reset the order array

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('Status', changeType);
        urlEncodedData.append('IdempotencyKey', this.identity + Date.now().toString());
        urlEncodedData.append('StatusCallback', this._statusCallback);

        try {
            const response = await this._twilioAPI.post(theUrl, urlEncodedData);
            //console.log(`_changeSession Response data: ${JSON.stringify(response.data)}`);

            this._cardData.capturing = false;
            this._cardData.capturingCard = false;
            this._cardData.capturingCvc = false;
            this._cardData.capturingDate = false;
        } catch (error) {
            console.error(`Could not change Session Status to ${changeType} with Error: ${error}`);
        }
        //console.log(`_changeSession: this._cardData.captureComplete: ${this._cardData.captureComplete}`);
    },

    /**
     * Cancel this Assisted Pay session 
     */
    async cancelCapture() {
        console.log(`Cancelling: ${this._payMapItemKey}`);
        this._cardData.captureComplete = false;

        // Cancel the payment
        await this._changeSession("cancel");
        console.log(`Pay cancelled payMapItem key: ${this._payMapItemKey}`);

        // Remove the syncMapItem to avoid visual issues
        try {
            await this._payMap.remove(this._payMapItemKey);
            console.log(`payMapItem removed with key: ${this._payMapItemKey}`);
            this._cardData.paymentCardNumber = "";
            this._cardData.securityCode = "";
            this._cardData.expirationDate = "";
        } catch (error) {
            console.log(`Error deleting cancelled payMapItem with error: ${error}`);
        }
    },

    /**
     * Complete this Assisted Pay session and submit for tokenization
     */
    async submitCapture() {
        await this._changeSession("complete");
        this._cardData.captureComplete = false;
        //console.log(`submitCapture: this._cardData.captureComplete: ${this._cardData.captureComplete}`);
    }
}

export default PayClient;