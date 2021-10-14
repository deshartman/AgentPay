

// get the reference of EventEmitter class of events module
import { EventEmitter } from 'events';
import AccessToken from "twilio/lib/jwt/AccessToken";
import SyncClient from "twilio-sync";
import axios from "axios";

/**
 * This is the main calls for the Pay SDK. It takes care of all the connectivity to the Voice <Pay> API
 * as well as synchronizing the data via Sync.
 * 
 * The Merchant Server has to pass in the following data to configure the SDK:
 * 
 *      twilioAccountSid: String,
        twilioApiKey: String,
        twilioApiSecret: String,        
        functionsURL: String,         // The Twilio Functions URL where the call handlers are deployed
        payConnector: String,         // The name of the Twilio Pay connector configured
        paySyncServiceSid: String,    // Sync ServiceSid. All maps will be created
        captureOrder: [
            "payment-card-number",
            "security-code",
            "expiration-date",
        ],
        currency: String,
        tokenType: String,
 * 
 * 
 * The class will emit the following events when data changes:
 * 
 * 
    'callConnected', callSid: String
    'cardUpdate', {
        "paymentCardNumber": String,
        "paymentCardType":String,
        "securityCode":String,
        "expirationDate":String,
        "paymentToken":String,
    }
    'capturing'
    'capturingCard'
    'capturingSecurityCode'
    'capturingDate'
    'captureComplete'
    'cardReset'
    'securityCodeReset'
    'dateReset'
    'cancelledCapture'
    'submitComplete'
 * 
 */
export default class AgentAssistPayClient extends EventEmitter {

    constructor(merchantServerUrl = null, identity = "unknown") {
        super();

        this._version = "v0.2";
        this.merchantServerUrl = merchantServerUrl;
        this.identity = identity;
        this.callSID = null;

        // Axios setup for Twilio API calls directly from the client
        this._twilioAPI = null;
        this._statusCallback = '';

        // Sync variables
        this._syncClient = null;
        this._payMap = null;
        this._paySID = "";
        this._syncToken = "";

        // Payment Variables

        this.paymentCardNumber = "";
        this.securityCode = "";
        this.expirationDate = "";
        this.paymentToken = "";
        this.paymentCardType = "";

        // Payment state
        this._capture = "";
        this._partialResult = true;
        this._required = "";

        this._captureOrder = [];
        this._captureOrderTemplate = [];
        this._payConnector = '';
        this._paySyncServiceSid = '';
    }

    async _getConfig(url) {
        // Grab config from the Merchant Server
        try {
            const config = await axios.get(url);
            //console.log(`the config: ${JSON.stringify(config.data, null, 4)}`);

            this._twilioAPI = axios.create({
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
            });

            try {
                //console.log(`Getting sync-token`);
                const SyncGrant = AccessToken.SyncGrant;
                const syncGrant = new SyncGrant({
                    serviceSid: config.data.paySyncServiceSid
                });

                // Create an access token which we will sign and return to the client,
                // containing the grant we just created
                const accessToken = new AccessToken(
                    config.data.twilioAccountSid,
                    config.data.twilioApiKey,
                    config.data.twilioApiSecret,
                    { identity: this.identity }
                );

                accessToken.addGrant(syncGrant);
                this._syncToken = accessToken.toJwt();
                //console.log(`sync-token: ${this._syncToken}`);

                this._statusCallback = config.data.functionsURL + '/paySyncUpdate';
                this._payConnector = config.data.payConnector;
                this._paySyncServiceSid = config.data.paySyncServiceSid;        // TODO: Where is this used?
                this._captureOrderTemplate = config.data.captureOrder.slice(); // copy by value
                this._captureOrder = config.data.captureOrder.slice(); // copy by value TODO: Can probably remove this, since CaptureToken sets it anyway
                this._currency = config.data.currency;
                this._tokenType = config.data.tokenType;

            } catch (error) {
                console.error(`Error getting sync token: ${error}`);
            }
        } catch (error) {
            console.error(`Error getting config from Merchant Server: ${error}`);
        }
    };

    _checkPayProgress() {
        if (this._capture) {
            if (this._required.includes(this._captureOrder[0])) {
                // continue _capture
                console.log(`Capturing: [${this._captureOrder[0]}]`);
            } else {
                // move to next Capture Type in the list
                if (this._required.length > 0) {
                    // Remove the current (first) item in capture Order Array
                    this._captureOrder.shift();
                    console.log(`Changing to: ${this._captureOrder[0]}`);
                    this._updateCaptureType(this._captureOrder[0]);
                } else {
                    // Stop capture
                    console.log(`Stopping Capture`);
                    this.emit('captureComplete');

                    //this.submitCapture();
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
        this._captureOrder = this._captureOrderTemplate.slice(); // copy by value to reset the order array

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
     */
    async attachPay(callSid = null) {
        this.callSID = callSid;

        try {
            await this._getConfig(this.merchantServerUrl + '/getConfig');

            this._syncClient = new SyncClient(this._syncToken, {});
            this._payMap = await this._syncClient.map('payMap');

            // If a Call SID was passed in, CTI has the call already and now opening view
            if (this.callSID) {
                console.log(`Initialize with a CTI callSid: ${this.callSID} `);

                // Update View element events
                this.emit('callConnected', this.callSID);

                // Now start the capture
                //this.startCapture();
            } else {
                // View opened with no call, so cannot determine the Call SID
                console.log(`Cannot determine the Call SID.Please place a call or initiate the app with a call SID`);

                ////////////////////////////////////////////// REMOVE WHEN USING CTI ///////////////////////////////////////////////////
                //////// TODO: Temporary hack to automatically grab the Call SID. This would normally be done by CTI or Flex ///////////
                const guidMap = await this._syncClient.map('guidMap');
                guidMap.on('itemAdded', (args) => {

                    // Update View element events
                    this.callSID = args.item.data.SID;
                    console.log(`SYNC itemAdded: Call SID is = ${this.callSID} `);
                    this.emit('callConnected', this.callSID);

                    //console.log(`Initialise.TEMP HACK`);
                    // Now initialise the capture
                    //this.startCapture();
                });
                /////////////////////////////////////////////////////////////////////////////////////////////////////////
            }

            // Add Event Listener for data changes. Update the card data
            this._payMap.on('itemUpdated', (args) => {
                //console.log(`_payMap item ${ JSON.stringify(args, null, 4) } was UPDATED`);
                // Update the local variables
                this._paySID = args.item.key;
                this.paymentCardNumber = args.item.data.PaymentCardNumber;
                this.securityCode = args.item.data.SecurityCode;
                this.expirationDate = args.item.data.ExpirationDate;
                this.paymentToken = args.item.data.PaymentToken;
                this.paymentCardType = args.item.data.PaymentCardType;
                this._capture = args.item.data.Capture;
                this._partialResult = args.item.data.PartialResult;
                this._required = args.item.data.Required;

                // View update event
                this.emit('cardUpdate', {
                    "paymentCardNumber": args.item.data.PaymentCardNumber,
                    "securityCode": args.item.data.SecurityCode,
                    "expirationDate": args.item.data.ExpirationDate,
                    "paymentToken": args.item.data.PaymentToken,
                    "paymentCardType": args.item.data.PaymentCardType,
                });

                // Check if we need to move to next capture item
                this._checkPayProgress();
            });
        } catch (error) {
            console.error(`Could not Initialize.Error setting up Pay Session with Error: ${error} `);
        }
    };


    async startCapture() {
        //  https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls/{this.callSID}/Payments.json
        let theUrl = '/Calls/' + this.callSID + '/Payments.json';
        //console.log(`startCapture url: [${ theUrl }]`);
        this._captureOrder = this._captureOrderTemplate.slice(); // Copy value

        // URL Encode the POST body data
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('IdempotencyKey', this.identity + Date.now().toString());
        urlEncodedData.append('StatusCallback', this._statusCallback);
        urlEncodedData.append('ChargeAmount', '0');
        urlEncodedData.append('TokenType', this._tokenType);
        urlEncodedData.append('Currency', this._currency);
        urlEncodedData.append('PaymentConnector', this._payConnector);
        urlEncodedData.append('SecurityCode', this._captureOrder.includes('security-code')); // set flag based on contents of _captureOrder array
        urlEncodedData.append('PostalCode', this._captureOrder.includes('postal-code')); // set flag based on contents of _captureOrder array

        //console.log(`startCapture: urlEncoded data = ${ urlEncodedData } `);
        try {
            const response = await this._twilioAPI.post(theUrl, urlEncodedData);
            this._paySID = response.data.sid;
            //console.log(`StartCapture: paySID: ${ this._paySID } `);
            // Update View element events
            console.log(`startCapture: Starting capture`);
            this.emit('capturing');
            await this._updateCaptureType(this._captureOrder[0]);
        } catch (error) {
            console.error(`Error with Capture Token: ${error} `);
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
                    this.emit('capturingSecurityCode');
                    break;
                case "expiration-date":
                    this.emit('capturingDate');
                    break;
            }
        } catch (error) {
            console.error(`Could not update CaptureType to ${captureType} with Error: ${error} `);
        }
    };


    updateCallSid(callSid) {
        this.callSID = callSid;
        this.emit('callConnected', this.callSID);
    };

    /**
     * Reset the card Number captured.
     */
    resetCard() {
        if (this._captureOrder[0] === "payment-card-number") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("payment-card-number");
            this.emit('cardReset');
        }
        this._updateCaptureType(this._captureOrder[0]);
    };

    /**
     * Reset the card SecurityCode captured.
     */
    resetSecurityCode() {
        if (this._captureOrder[0] === "security-code") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("security-code");
            this.emit('securityCodeReset');
        }
        this._updateCaptureType(this._captureOrder[0]);
    };

    /**
     * Reset the card Exp. Date captured.
     */
    resetDate() {
        if (this._captureOrder[0] === "expiration-date") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("expiration-date");
            this.emit('dateReset');
        }
        this._updateCaptureType(this._captureOrder[0]);
    };

    async cancelCapture() {
        // Cancel the payment
        await this._changeSession("cancel");
        //console.log(`Pay cancelled paySID key: ${ this._paySID } `);

        // Remove the syncMapItem to avoid visual issues
        try {
            await this._payMap.remove(this._paySID);
            //console.log(`payMapItem removed with key: ${ this._paySID } `);
            this.emit('cancelledCapture');
        } catch (error) {
            console.log(`Error deleting cancelled payMapItem with error: ${error} `);
        }
    };

    async submitCapture() {
        await this._changeSession("complete");
        this.emit('submitComplete');
    };
}