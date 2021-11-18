import { EventEmitter } from 'events';
import { SyncClient } from "twilio-sync";
import axios from "axios";

// Segment Anayltics (Optional)
import Analytics from 'analytics'
import segmentPlugin from '@analytics/segment'

/**
 * This is the main calls for the Pay SDK. It takes care of all the connectivity to the Voice <Pay> API
 * as well as synchronizing the data via Sync.
 * 
 * Constructor:
 * @param {string} functionsURL - The Twilio Functions URL where the call handlers are deployed.
 * @param {string} identity - The identity of the user calling the PayClient
 * @param {string} paymentConnector - The name of the Twilio Pay connector configured.
 * @param {string} captureOrder - These are Merchant specific config, each Agent will use each time
 * @param {string} currency - The currency to use for the transaction. USD is default
 * @param {string} tokenType - The token type to use for the transaction one-time || reusable
 * @param {string} writeKey - OPTIONAL: The write key for Twilio Segment service. Leave blank to ignore
 *
 * The class will emit the following events when data changes:
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

    constructor(functionsURL, identity, paymentConnector,
        captureOrder = ["payment-card-number, security-code, expiration-date"],
        currency = "USD",
        tokenType = "reusable",
        writeKey = null
    ) {

        super();

        this._version = "v3.0.1";

        this.functionsURL = functionsURL;
        this.identity = identity;
        this.paymentConnector = paymentConnector;
        console.log(`SDK paymentConnector: ${this.paymentConnector}`);
        this.currency = currency;
        this.tokenType = tokenType;

        // Segment added if Write Key exists
        if (writeKey) {
            //console.log(`Logging to Segment`);
            this.analytics = Analytics({
                app: 'agent-assisted-pay',
                plugins: [
                    segmentPlugin({
                        writeKey: writeKey
                    })
                ]
            })
        };

        // Call variables
        this.callSid = null;

        /** 
         * Internal Module variables, not exposed
         */
        this._twilioAPI = null;
        this._statusCallback = '';

        // Sync variables
        this._syncClient = null;
        this._payMap = null;
        this._paySid = "";
        this._syncToken = "";

        // Payment state
        this._capture = "";
        this._partialResult = true;
        this._required = "";

        // Convert Capture Order string to an Array, removing whitespace
        this._captureOrder = captureOrder.split(",").map(item => item.trim());
        this._captureOrderTemplate = this._captureOrder.slice();
    };

    /**
     * Initialize the Agent Assisted Pay Session for a call (SID)
     * 
     * @param {*} callSid 
     */
    async attachPay(callSid = null) {   //
        this.callSid = callSid;

        this._statusCallback = this.functionsURL + '/paySyncUpdate';
        //this._captureOrder = this._captureOrderTemplate.slice(); // copy by value

        /* Segment Action  */
        if (this.analytics) {
            this.analytics.track('attachPay', {
                identity: this.identity,
            });
        }

        try {
            // Get Sync Token
            const syncToken = await axios.get(this.functionsURL + "/getSyncToken", { params: { identity: this.identity } });
            console.log(`Sync Token: ${syncToken.data}`);

            this._syncClient = new SyncClient(syncToken.data, {});
            this._payMap = await this._syncClient.map('payMap');
            //console.log('payMap created');

            // If a Call SID was passed in, CTI has the call already and now opening view
            if (this.callSid) {
                console.log(`Initialize with a CTI callSid: ${this.callSid} `);

                // Update View element events
                this.emit('callConnected', this.callSid);

                /* Segment Action  */
                if (this.analytics) {
                    //console.log(`Logging attachPay to Segment`);
                    this.analytics.track('attachPay', {
                        identity: this.identity,
                        callSID: this.callSid,
                        timeStamp: Date.now(),
                    });
                }
            } else {
                // View opened with no call, so cannot determine the Call SID
                console.log(`Cannot determine the Call SID.Please place a call or initiate the app with a call SID`);

                ////////////////////////////////////////////// REMOVE WHEN USING CTI ///////////////////////////////////////////////////
                //////// TODO: Temporary hack to automatically grab the Call SID. This would normally be done by CTI or Flex ///////////
                const guidMap = await this._syncClient.map('guidMap');
                guidMap.on('itemAdded', (args) => {

                    // Update View element events
                    this.callSid = args.item.data.SID;
                    console.log(`SYNC guidMap.on('itemAdded'): Call SID: ${this.callSid} `);
                    this.emit('callConnected', this.callSid);

                    /* Segment Action  */
                    if (this.analytics) {
                        //console.log(`Logging attachPay to Segment`);
                        this.analytics.track('attachPay', {
                            identity: this.identity,
                            callSID: this.callSid,
                            timeStamp: Date.now(),
                        });
                    }

                    console.log(`Initialised. TEMP HACK`);
                });
                /////////////////////////////////////////////////////////////////////////////////////////////////////////
            }

            // Add Event Listener for data changes. Update the card data
            this._payMap.on('itemUpdated', (args) => {
                // console.log(`_payMap item ${JSON.stringify(args, null, 4)} was UPDATED`);\

                // Update the local variables
                this._paySid = args.item.key;
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
            console.error(`Could not Initialize. Error setting up Pay Session with Error: ${error} `);
        }
    };

    /*
    * Operate on the capture order array, removing items from the front of the array
    * and moving to the next item in the array, updating the capture type.
    * If the array is complete, stop capturing
    */
    _checkPayProgress() {   // OK
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
                    this.emit('captureComplete');
                    console.log(`Stopping Capture`);
                }
            }
        } else {
            console.log(`Not in _capture mode`);
        }
    };

    /*
    * 
    */
    async _changeSession(changeType) {  // OK - test
        //console.log(`_changeSession ChangeType: ${changeType}`);

        // Reset the Capture Order
        this._captureOrder = this._captureOrderTemplate.slice(); // copy by value to reset the order array

        // POST body data
        const data =
        {
            'callSid': this.callSid,
            'paySid': this._paySid,
            'Status': changeType,
            'IdempotencyKey': this.identity + Date.now().toString(),
            'StatusCallback': this._statusCallback,
        }
        console.log(`_changeSession: data = ${JSON.stringify(data, null, 4)} `);

        try {
            const response = await axios.post(this.functionsURL + '/changeSession', data);
            //console.log(`_changeSession Response data: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.error(`Could not change Session Status to ${changeType} with Error: ${error}`);
        }
    };

    /**
    * This kicks off the capture process.
    */
    async startCapture() {  // 
        this._captureOrder = this._captureOrderTemplate.slice(); // Copy values

        // POST body data
        const data =
        {
            'callSid': this.callSid,
            'IdempotencyKey': this.identity + Date.now().toString(),
            'StatusCallback': this._statusCallback,
            'ChargeAmount': 0,
            'TokenType': this.tokenType,
            'Currency': this.currency,
            'PaymentConnector': this.paymentConnector,
            'SecurityCode': this._captureOrder.includes('security-code'), // set flag based on contents of _captureOrder array
            'PostalCode': this._captureOrder.includes('postal-code'), // set flag based on contents of _captureOrder array
        }
        //console.log(`startCapture: data = ${ data } `);

        try {
            const response = await axios.post(this.functionsURL + '/startCapture', data);
            this._paySid = response.data;
            console.log(`StartCapture: paySid: ${this._paySid} `);

            // Update View element events
            this.emit('capturing');

            await this._updateCaptureType(this._captureOrder[0]);

            /* Segment Action  */
            if (this.analytics) {
                //console.log(`Logging startCapture to Segment`);
                this.analytics.track('startCapture', {
                    identity: this.identity,
                    callSID: this.callSid,
                    timeStamp: Date.now(),
                });
            }

        } catch (error) {
            console.error(`Error with Capture Token: ${error} `);
        }
    };

    /*
     * Cycle through the different capture Types in the API, based on the current capture Order Array passed in
     * @param {*} captureType 
     */
    async _updateCaptureType(captureType) { // 
        //console.log(`paySid: ${this._paySid}`);

        // POST body data
        const data =
        {
            'callSid': this.callSid,
            'paySid': this._paySid,
            'captureType': captureType,
            'IdempotencyKey': this.identity + Date.now().toString(),
            'StatusCallback': this._statusCallback,
        }
        //console.log(`Update Capture: data = ${JSON.stringify(data, null, 4)}`);

        try {
            const response = await axios.post(this.functionsURL + '/updateCaptureType', data);
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
            };

            /* Segment Action  */
            if (this.analytics) {
                this.analytics.track('_updateCaptureType', {
                    identity: this.identity,
                    callSID: this.callSid,
                    captureType: captureType,
                    timeStamp: Date.now(),
                });
            }
        } catch (error) {
            console.error(`Could not update CaptureType to ${captureType} with Error: ${error} `);
        }
    };

    /**
     * Update the call Sid for this payClient Session
     * @param {String} callSid 
     */
    updateCallSid(callSid) {    // OK
        this.callSid = callSid;
        this.emit('callConnected', this.callSid);
    };

    resetCard() {   // OK
        if (this._captureOrder[0] === "payment-card-number") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("payment-card-number");
            this.emit('cardReset');
        }

        /* Segment Action  */
        if (this.analytics) {
            this.analytics.track('resetCard', {
                identity: this.identity,
                callSID: this.callSid,
                timeStamp: Date.now(),
            });
        }

        this._updateCaptureType(this._captureOrder[0]);
    };

    resetSecurityCode() {   // OK
        if (this._captureOrder[0] === "security-code") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("security-code");
            this.emit('securityCodeReset');
        }

        /* Segment Action  */
        if (this.analytics) {
            this.analytics.track('resetSecurityCode', {
                identity: this.identity,
                callSID: this.callSid,
                timeStamp: Date.now(),
            });
        }

        this._updateCaptureType(this._captureOrder[0]);
    };

    resetDate() {   // OK
        if (this._captureOrder[0] === "expiration-date") {
            // already capturing
        } else {
            // Add item back to front of array
            this._captureOrder.unshift("expiration-date");
            this.emit('dateReset');
        }

        /* Segment Action  */
        if (this.analytics) {
            this.analytics.track('resetDate', {
                identity: this.identity,
                callSID: this.callSid,
                timeStamp: Date.now(),
            });
        }

        this._updateCaptureType(this._captureOrder[0]);
    };

    /**
     * Cancel the current capture process
     */
    async cancelCapture() { // OK
        // Cancel the payment
        await this._changeSession("cancel");
        //console.log(`Pay cancelled paySid key: ${ this._paySid } `);

        // Remove the syncMapItem to avoid visual issues
        try {
            await this._payMap.remove(this._paySid);
            //console.log(`payMapItem removed with key: ${ this._paySid } `);
            this.emit('cancelledCapture');

            /* Segment Action  */
            if (this.analytics) {
                this.analytics.track('cancelCapture', {
                    identity: this.identity,
                    callSID: this.callSid,
                    timeStamp: Date.now(),
                });
            }
        } catch (error) {
            console.log(`Error deleting cancelled payMapItem with error: ${error} `);
        }
    };

    /**
     * Submit the current capture process
     */
    async submitCapture() { // OK
        await this._changeSession("complete");
        this.emit('submitComplete');

        /* Segment Action  */
        if (this.analytics) {
            this.analytics.track('submitCapture', {
                identity: this.identity,
                callSID: this.callSid,
                timeStamp: Date.now(),
            });
        }
    };

    /**
     * Complete the session and detach the payment.
     * 
     * Remove all event listeners
     */
    async detachPay() {
        try {
            // Remove Event Listener
            this._payMap.removeAllListeners(['itemUpdated']);
            // Close the map
            this._payMap.close();

            this.emit('stopCapturing');
            console.log(`endCapture success`);


            /* Segment Action  */
            if (this.analytics) {
                this.analytics.track('detachPay', {
                    identity: this.identity,
                    callSID: this.callSid,
                    timeStamp: Date.now(),
                });
            }

        } catch (error) {
            console.log(`endCapture error: ${error}`);
        }
    }
}