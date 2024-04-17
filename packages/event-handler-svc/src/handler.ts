/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    CommandMsg,
    IMessage,
    IMessageConsumer,
    IMessageProducer,
    MessageTypes
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {

	QuoteRequestReceivedEvt,
    QuoteResponseReceivedEvt,
    QuotingBCTopics,

} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { RequestReceivedQuoteCmd, RequestReceivedQuoteCmdPayload, ResponseReceivedQuoteCmd, ResponseReceivedQuoteCmdPayload } from "../../domain-lib";

import {ICounter, IGauge, IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";

export class QuotingEventHandler{
	private _logger: ILogger;
	private _auditClient: IAuditClient;
	private _messageConsumer: IMessageConsumer;
	private _messageProducer: IMessageProducer;
    private _quoteDurationHisto:IHistogram;
    private _histo:IHistogram;
    private _eventsCounter:ICounter;
    private _batchSizeGauge:IGauge;

	constructor(logger: ILogger, auditClient:IAuditClient, messageConsumer: IMessageConsumer, messageProducer: IMessageProducer, metrics:IMetrics) {
		this._logger = logger.createChild(this.constructor.name);
		this._auditClient = auditClient;
		this._messageConsumer = messageConsumer;
		this._messageProducer = messageProducer;

        this._quoteDurationHisto = metrics.getHistogram("QuotingDuration", "Quoting duration by leg", ["leg"]);
        this._histo = metrics.getHistogram("QuotingEventHandler_Calls", "Events funcion calls processed the Quoting Event Handler", ["callName", "success"]);
        this._eventsCounter = metrics.getCounter("QuotingEventHandler_EventsProcessed", "Events processed by the Quoting Event Handler", ["eventName"]);
        this._batchSizeGauge = metrics.getGauge("QuotingEventHandler_batchSize");
	}

	async start():Promise<void>{
		// connect the producer
		await this._messageProducer.connect();

		// create and start the consumer handler
		this._messageConsumer.setTopics([QuotingBCTopics.DomainRequests, QuotingBCTopics.DomainEvents]);

        this._messageConsumer.setBatchCallbackFn(this._batchMsgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
    }

    private async _batchMsgHandler(receivedMessages: IMessage[]): Promise<void>{
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise<void>(async (resolve) => {
            console.log(`Got message batch in QuotingEventHandler batch size: ${receivedMessages.length}`);
            this._batchSizeGauge.set(receivedMessages.length);

            const startTime = Date.now();
            const timerEndFn = this._histo.startTimer({ callName: "batchMsgHandler"});

            try{
                const outputCommands:CommandMsg[] = [];
                for(const message of receivedMessages){
                    if(message.msgType!=MessageTypes.DOMAIN_EVENT) continue;

                    const quoteCmd: CommandMsg | null = this._getCmdFromEvent(message);
                    if(quoteCmd) {
                        outputCommands.push(quoteCmd);
                        this._eventsCounter.inc({eventName: message.msgName}, 1);
                    }

                    // metrics
                    if(!message.fspiopOpaqueState) continue;
                    const now = Date.now();
                    if(message.msgName === QuoteRequestReceivedEvt.name && message.fspiopOpaqueState.prepareSendTimestamp){
                        this._quoteDurationHisto.observe({"leg": "prepare"}, now - message.fspiopOpaqueState.prepareSendTimestamp);
                    }else if(message.msgName === QuoteResponseReceivedEvt.name && message.fspiopOpaqueState.committedSendTimestamp ){
                        this._quoteDurationHisto.observe({"leg": "fulfil"}, now - message.fspiopOpaqueState.committedSendTimestamp);
                        if(message.fspiopOpaqueState.prepareSendTimestamp){
                            this._quoteDurationHisto.observe({"leg": "total"}, now - message.fspiopOpaqueState.prepareSendTimestamp);
                        }
                    }
                }

                console.log("before messageProducer.send()...");
                await this._messageProducer.send(outputCommands);
                console.log("after messageProducer.send()");
                timerEndFn({ success: "true" });
            }catch(err: unknown){
                const error = (err as Error);
                this._logger.error(err, `QuotingEventHandler - failed processing batch - Error: ${error.message || error.toString()}`);
                timerEndFn({ success: "false" });
            }finally {
                console.log(`  Completed batch in QuotingEventHandler batch size: ${receivedMessages.length}`);
                console.log(`  Took: ${Date.now()-startTime}`);
                console.log("\n\n");

                resolve();
            }
        });
    }

    private _getCmdFromEvent(message: IMessage):CommandMsg | null{
        if(message.msgName === QuoteRequestReceivedEvt.name) {
            const quoteCmd = this._prepareEventToRequestReceiveQuoteCommand(message as QuoteRequestReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === QuoteResponseReceivedEvt.name){
            const quoteCmd = this._prepareEventToResponseReceiveQuoteCommand(message as QuoteResponseReceivedEvt);
            return quoteCmd;
        }else{
            // ignore silently what we don't handle
            return null;
        }

    }

    private _prepareEventToRequestReceiveQuoteCommand(evt: QuoteRequestReceivedEvt): RequestReceivedQuoteCmd{
		const cmdPayload: RequestReceivedQuoteCmdPayload = {
			bulkQuoteId: null,
			quoteId: evt.payload.quoteId,
			transactionId: evt.payload.transactionId,
			transactionRequestId: evt.payload.transactionRequestId,
			payee: evt.payload.payee,
			payer: evt.payload.payer,
			amountType: evt.payload.amountType,
			amount: evt.payload.amount,
			transactionType: evt.payload.transactionType,
			converter: evt.payload.converter,
			currencyConversion: evt.payload.currencyConversion,
			fees: evt.payload.fees,
			geoCode: evt.payload.geoCode,
			note: evt.payload.note,
			expiration: evt.payload.expiration,
			extensionList: evt.payload.extensionList,
			prepare: evt.fspiopOpaqueState,
		};
		const cmd = new RequestReceivedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

	private _prepareEventToResponseReceiveQuoteCommand(evt: QuoteResponseReceivedEvt): ResponseReceivedQuoteCmd {
		const cmdPayload: ResponseReceivedQuoteCmdPayload = {
			quoteId: evt.payload.quoteId,
			transferAmount: evt.payload.transferAmount,
			expiration: evt.payload.expiration,
			ilpPacket: evt.payload.ilpPacket,
			condition: evt.payload.condition,
			payeeReceiveAmount: evt.payload.payeeReceiveAmount,
			payeeFspFee: evt.payload.payeeFspFee,
			payeeFspCommission: evt.payload.payeeFspCommission,
			geoCode: evt.payload.geoCode,
			extensionList: evt.payload.extensionList,
			prepare: evt.fspiopOpaqueState,
		};
		const cmd = new ResponseReceivedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

	async stop():Promise<void>{
		await this._messageConsumer.stop();
	}
}
