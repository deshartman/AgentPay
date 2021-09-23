// get the reference of EventEmitter class of events module
import { EventEmitter } from 'events';
import axios from "axios";


// //Subscribe for FirstEvent
// em.on('FirstEvent', function (data) {
//     console.log('First subscriber: ' + data);
// });


export default class AgentAssistPayClient extends EventEmitter {

    constructor(merchantServerUrl = null, identity = null, callSid = null, currency = 'USD', tokenType = 'reusable') {
        this._version = "v0.2";
        this.merchantServerUrl = merchantServerUrl;
        this.identity = identity;
        this.callSID = '';
        this.currency = currency;
        this.tokenType = tokenType;

        // Axios setup for Twilio API calls directly from the client
        this._twilioAPI = null;
        this._statusCallback = '';

        // Sync variables
        this._syncClient = null;
        this._payMap = null;
        this._payMapItemKey = null;
        this._syncToken = "";


        // Payment Variables
        this._paySID = '';
        this._cardData = {};
        this._capture = "";
        this._partialResult = true;
        this._required = "";

        this._captureOrder = [];
        this._captureOrderTemplate = [];
        this._payConnector = '';

    }




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
            this._captureOrderTemplate = config.data.captureOrder.slice(); // copy by value
            this.captureOrder = config.data.captureOrder.slice(); // copy by value TODO: Can probably remove this, since CaptureToken sets it anyway
            // this.currency = config.data.currency;
            // this.tokenType = config.data.tokenType;
            // this.identity = config.data.identity;

            try {
                console.log(`Getting sync-token`);
                // TODO: Call the mock server and decode the pay token to get the sync token
                this._syncToken = accessToken.toJwt();
                console.log(`sync-token: ${this._syncToken}`);
            } catch (error) {
                console.error(`Error getting sync token: ${error}`);
            }
        } catch (error) {
            console.error(`Error getting config from Merchant Server: ${error}`);
        }
    };

    _checkPayProgress() {
        if (this._capture) {
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
                    // Stop capture
                    console.log(`Stopping Capture`);
                    this.emit('captureComplete');

                    this.submitCapture();
                }
            }
        } else {
            console.log(`Not in _capture mode`);
        }
    };

    async _changeSession(changeType) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this.callSID + '/Payments/' + this._paySID + '.json';

        console.log(`_changeSession ChangeType: ${changeType}`);

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
        } catch (error) {
            console.error(`Could not change Session Status to ${changeType} with Error: ${error}`);
        }
    };

    /**
     * Initialise the Agent Assisted Pay Session by getting the configuration parameters from the Merchant server
     * The Merchant server will provide the parameters in the following object format:
     *
     * @param {URL: String} merchantServerUrl
     * @param {callSid: String} callSid
     *
    */
    async initialize(merchantServerUrl, callSid = null) {

        try {
            await this._getConfig(merchantServerUrl + '/getConfig');

            console.log(`Setting up Sync`);
            this._syncClient = new SyncClient(this._syncToken, {});
            this._payMap = await this._syncClient.map('payMap');
            console.log(`Setting up Sync COMPLETE`);

            // If a Call SID was passed in, CTI has the call already and now opening view
            if (callSid) {
                this.callSID = callSid;
                console.log(`Initialize with a CTI callSid: ${this.callSID}`);

                // Update View element events
                this.emit('callConnected');
                // this._cardData.capturing = false;
                // this._cardData.captureComplete = false;

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
                    this.callSID = args.item.data.SID;
                    console.log(`Call SID is = ${this.callSID}`);
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
    };


    async captureToken() {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments.json
        let theUrl = '/Calls/' + this.callSID + '/Payments.json';
        console.log(`captureToken url: [${theUrl}]`);
        this.captureOrder = this._captureOrderTemplate.slice(); // Copy value

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
            // Update View element events
            this.emit('capturing');
            await this._updateCaptureType(this.captureOrder[0]);
        } catch (error) {
            console.error(`Error with Capture Token: ${error}`);
        }
    };

    async _updateCaptureType(captureType) {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments/{Sid}.json
        let theUrl = '/Calls/' + this.callSID + '/Payments/' + this._paySID + '.json';

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
                    // Update View element events
                    this.emit('capturingCard');
                    break;
                case "security-code":
                    this.emit('capturingCvc');
                    break;
                case "expiration-date":
                    this.emit('capturingDate');
                    break;
            }
        } catch (error) {
            console.error(`Could not update CaptureType to ${captureType} with Error: ${error}`);
        }
    };


    updateCallSid(callSid) {
        this.callSID = callSid;
        this.emit('callConnected');
    };

    /**
     * Reset the card Number captured.
     */
    resetCard() {
        if (this.captureOrder[0] === "payment-card-number") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("payment-card-number");
            this.emit('cardReset');
        }
        this._updateCaptureType(this.captureOrder[0]);
    };

    /**
     * Reset the card CVC captured.
     */
    resetCvc() {
        if (this.captureOrder[0] === "security-code") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("security-code");
            this.emit('cvcReset');
        }
        this._updateCaptureType(this.captureOrder[0]);
    };

    /**
     * Reset the card Exp. Date captured.
     */
    resetDate() {
        if (this.captureOrder[0] === "expiration-date") {
            // already capturing
        } else {
            // Add item back to front of array
            this.captureOrder.unshift("expiration-date");
            this.emit('dateReset');
        }
        this._updateCaptureType(this.captureOrder[0]);
    };

    async cancelCapture() {
        console.log(`Cancelling: ${this._payMapItemKey}`);

        // Cancel the payment
        await this._changeSession("cancel");
        console.log(`Pay cancelled payMapItem key: ${this._payMapItemKey}`);

        // Remove the syncMapItem to avoid visual issues
        try {
            await this._payMap.remove(this._payMapItemKey);
            console.log(`payMapItem removed with key: ${this._payMapItemKey}`);
            this.emit('cancelledCapture');
        } catch (error) {
            console.log(`Error deleting cancelled payMapItem with error: ${error}`);
        }
    };

    async submitCapture() {
        await this._changeSession("complete");
        this.emit('submitComplete');
    };
}