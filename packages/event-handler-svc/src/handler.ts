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
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    CommandMsg,
    IMessage,
    IMessageConsumer,
    IMessageProducer,
    MessageTypes
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    BulkQuotePendingReceivedEvt,
    BulkQuoteQueryReceivedEvt,
    BulkQuoteRejectedEvt,
    BulkQuoteRequestedEvt,
    QuoteQueryReceivedEvt,
	QuoteRejectedEvt,
	QuoteRequestReceivedEvt,
    QuoteResponseReceivedEvt,
    QuotingBCTopics,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { 
    QueryReceivedBulkQuoteCmd,
    QueryReceivedBulkQuoteCmdPayload,
    QueryReceivedQuoteCmd,
    QueryReceivedQuoteCmdPayload,
    RejectedBulkQuoteCmd,
    RejectedBulkQuoteCmdPayload,
    RejectedQuoteCmd,
    RejectedQuoteCmdPayload,
    RequestReceivedBulkQuoteCmd,
    RequestReceivedBulkQuoteCmdPayload,
    RequestReceivedQuoteCmd,
    RequestReceivedQuoteCmdPayload,
    ResponseReceivedBulkQuoteCmd,
    ResponseReceivedBulkQuoteCmdPayload,
    ResponseReceivedQuoteCmd,
    ResponseReceivedQuoteCmdPayload 
} from "../../domain-lib";

import {
    Context,
    ICounter,
    IGauge,
    IHistogram,
    IMetrics,
    Tracer
} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {OpenTelemetryClient} from "@mojaloop/platform-shared-lib-observability-client-lib";
import * as OpentelemetryApi from "@opentelemetry/api";
import {SpanKind, SpanOptions } from "@opentelemetry/api";

// These need to match the simulator - Should go to the observability types
export const TRACING_REQ_START_TS_HEADER_NAME="tracing-request-start-timestamp";
export const TRACING_RESP_START_TS_HEADER_NAME="tracing-response-start-timestamp";


export class QuotingEventHandler{
	private _logger: ILogger;
	private _messageConsumer: IMessageConsumer;
	private _messageProducer: IMessageProducer;
    private _quoteDurationHisto:IHistogram;
    private _histo:IHistogram;
    private _eventsCounter:ICounter;
    private _batchSizeGauge:IGauge;
    protected readonly _tracer: Tracer;

	constructor(logger: ILogger, messageConsumer: IMessageConsumer, messageProducer: IMessageProducer, metrics:IMetrics) {
		this._logger = logger.createChild(this.constructor.name);
		this._messageConsumer = messageConsumer;
		this._messageProducer = messageProducer;

        this._quoteDurationHisto = metrics.getHistogram("QuotingDuration", "Quoting duration by leg", ["leg"]);
        this._histo = metrics.getHistogram("QuotingEventHandler_Calls", "Events function calls processed the Quoting Event Handler", ["callName", "success"]);
        this._eventsCounter = metrics.getCounter("QuotingEventHandler_EventsProcessed", "Events processed by the Quoting Event Handler", ["eventName"]);
        this._batchSizeGauge = metrics.getGauge("QuotingEventHandler_batchSize");

        this._tracer = OpenTelemetryClient.getInstance().trace.getTracer(this.constructor.name);
	}

	async start():Promise<void>{
		// connect the producer
		await this._messageProducer.connect();

		// create and start the consumer handler - we only care about DomainRequests (from the interop api bc)
		this._messageConsumer.setTopics([QuotingBCTopics.DomainRequests]);

        this._messageConsumer.setBatchCallbackFn(this._batchMsgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
    }

    private async _batchMsgHandler(receivedMessages: IMessage[]): Promise<void>{
        const startTime = Date.now();
        this._logger.isDebugEnabled() && this._logger.debug(`Got message batch in QuotingEventHandler batch size: ${receivedMessages.length}`);

        this._batchSizeGauge.set(receivedMessages.length);
        const timerEndFn = this._histo.startTimer({ callName: "batchMsgHandler"});


        try{
            const outputCommands:CommandMsg[] = [];
            for(const message of receivedMessages){
                if(message.msgType!=MessageTypes.DOMAIN_EVENT) continue;

                this._histo.observe({callName:"msgDelay"}, (startTime - message.msgTimestamp)/1000);

                const context =  OpenTelemetryClient.getInstance().propagationExtract(message.tracingInfo);

                const spanName = `processEvent ${message.msgName}`;
                const spanOptions: SpanOptions = {
                    kind: SpanKind.CONSUMER,
                    attributes: {
                        "msgName": message.msgName,
                        "entityId": message.payload.quoteId,
                        "quoteId": message.payload.quoteId,
                        "batchSize": receivedMessages.length
                    }
                };

                await this._tracer.startActiveSpan(spanName, spanOptions, context, async (span) => {
                    const quoteCmd: CommandMsg | null = this._getCmdFromEvent(message);

                    if(quoteCmd) {
                        // propagate tracingInfo object
                        quoteCmd.tracingInfo = {};
                        OpenTelemetryClient.getInstance().propagationInject(quoteCmd.tracingInfo);

                        outputCommands.push(quoteCmd);
                        this._eventsCounter.inc({eventName: message.msgName}, 1);
                    }

                    // metrics
                    this._recordMetricsFromContext(message.msgName, context);

                    span.end();
                });

                ////////////////////

               /* const parentSpan = OpenTelemetryClient.getInstance().startSpanWithPropagationInput(this._tracer, "processEvent", message.tracingInfo);
                parentSpan.setAttributes({
                    "msgName": message.msgName,
                    "quoteId": message.payload.quoteId,
                    "entityId": message.payload.quoteId,
                    "batchSize": receivedMessages.length
                });

                const quoteCmd: CommandMsg | null = this._getCmdFromEvent(message);

                if(quoteCmd) {
                    quoteCmd.tracingInfo = message.tracingInfo; // propagate tracingInfo object
                    outputCommands.push(quoteCmd);
                    this._eventsCounter.inc({eventName: message.msgName}, 1);
                }

                // inject tracing headers
                // try to get a tracing context from headers
                const tracingCtx = OpenTelemetryClient.getInstance().propagationExtract(message.tracingInfo);
                let baggage = OpentelemetryApi.propagation.getBaggage(tracingCtx)

                // metrics
                if(baggage) this._recordMetricsFromBaggage(message, baggage);

                parentSpan.end();*/
            }

            const timerEndFn_send = this._histo.startTimer({ callName: "messageProducer.send"});
            await this._messageProducer.send(outputCommands);
            timerEndFn_send({ success: "true" });
            timerEndFn({ success: "true" });
        }catch(err: unknown){
            const error = (err as Error);
            this._logger.error(err, `QuotingEventHandler - failed processing batch - Error: ${error.message || error.toString()}`);
            timerEndFn({ success: "false" });
        }finally {
            this._logger.isDebugEnabled() && this._logger.debug(`  Completed batch in QuotingEventHandler batch size: ${receivedMessages.length}`);
            this._logger.isDebugEnabled() && this._logger.debug(`  Took: ${Date.now()-startTime} ms \n\n`);
        }
    }

    private _recordMetricsFromContext(msgName:string, context:Context){
        const baggage = OpentelemetryApi.propagation.getBaggage(context);
        if(!baggage) return;

        const now = Date.now();
        const startTsBabbageValue = baggage.getEntry(TRACING_REQ_START_TS_HEADER_NAME)?.value;
        const startTs = startTsBabbageValue ? parseInt(startTsBabbageValue) : undefined;
        const respTsBabbageValue = baggage.getEntry(TRACING_RESP_START_TS_HEADER_NAME)?.value;
        const respTs = respTsBabbageValue ? parseInt(respTsBabbageValue) : undefined;

        if(msgName === QuoteRequestReceivedEvt.name && startTs){
            this._quoteDurationHisto.observe({"leg": "prepare"}, now - startTs);
        }else if(msgName === QuoteResponseReceivedEvt.name && respTs ){
            this._quoteDurationHisto.observe({"leg": "fulfil"}, now - respTs);
            if(startTs){
                this._quoteDurationHisto.observe({"leg": "total"}, now - startTs);
            }
        }
    }

    private _getCmdFromEvent(message: IMessage):CommandMsg | null{
        if(message.msgName === QuoteRequestReceivedEvt.name) {
            const quoteCmd = this._prepareEventToRequestReceiveQuoteCommand(message as QuoteRequestReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === QuoteResponseReceivedEvt.name){
            const quoteCmd = this._prepareEventToResponseReceiveQuoteCommand(message as QuoteResponseReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === QuoteQueryReceivedEvt.name){
            const quoteCmd = this._prepareEventToQueryReceiveQuoteCommand(message as QuoteQueryReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === QuoteRejectedEvt.name){
            const quoteCmd = this._prepareEventToRejectQuoteCommand(message as QuoteRejectedEvt);
            return quoteCmd;
        } else if(message.msgName === BulkQuoteRequestedEvt.name) {
            const quoteCmd = this._prepareEventToRequestReceiveBulkQuoteCommand(message as BulkQuoteRequestedEvt);
            return quoteCmd;
        }else if(message.msgName === BulkQuotePendingReceivedEvt.name){
            const quoteCmd = this._prepareEventToResponseReceiveBulkQuoteCommand(message as BulkQuotePendingReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === BulkQuoteQueryReceivedEvt.name){
            const quoteCmd = this._prepareEventToQueryReceiveBulkQuoteCommand(message as BulkQuoteQueryReceivedEvt);
            return quoteCmd;
        }else if(message.msgName === BulkQuoteRejectedEvt.name){
            const quoteCmd = this._prepareEventToRejectBulkQuoteCommand(message as BulkQuoteRejectedEvt);
            return quoteCmd;
        }else{
            // ignore silently what we don't handle
            return null;
        }

    }

    private _prepareEventToRequestReceiveQuoteCommand(evt: QuoteRequestReceivedEvt): RequestReceivedQuoteCmd {
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
		};
		const cmd = new RequestReceivedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

	private _prepareEventToResponseReceiveQuoteCommand(evt: QuoteResponseReceivedEvt): ResponseReceivedQuoteCmd {
		const cmdPayload: ResponseReceivedQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
			quoteId: evt.payload.quoteId,
			transferAmount: evt.payload.transferAmount,
			expiration: evt.payload.expiration,
            note: evt.payload.note,
			payeeReceiveAmount: evt.payload.payeeReceiveAmount,
			payeeFspFee: evt.payload.payeeFspFee,
			payeeFspCommission: evt.payload.payeeFspCommission,
			geoCode: evt.payload.geoCode,
		};
		const cmd = new ResponseReceivedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

	private _prepareEventToQueryReceiveQuoteCommand(evt: QuoteQueryReceivedEvt): QueryReceivedQuoteCmd {
		const cmdPayload: QueryReceivedQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            quoteId: evt.payload.quoteId,
        };
		const cmd = new QueryReceivedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

    private _prepareEventToRejectQuoteCommand(evt: QuoteRejectedEvt): RejectedQuoteCmd {
		const cmdPayload: RejectedQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            quoteId: evt.payload.quoteId,
            errorInformation: evt.payload.errorInformation,
        };
		const cmd = new RejectedQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

    private _prepareEventToRequestReceiveBulkQuoteCommand(evt: BulkQuoteRequestedEvt): RequestReceivedBulkQuoteCmd{
		const cmdPayload: RequestReceivedBulkQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            bulkQuoteId: evt.payload.bulkQuoteId,
            payer: evt.payload.payer,
            geoCode: evt.payload.geoCode,
            expiration: evt.payload.expiration,
            individualQuotes: evt.payload.individualQuotes,
        };
		const cmd = new RequestReceivedBulkQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

    private _prepareEventToResponseReceiveBulkQuoteCommand(evt: BulkQuotePendingReceivedEvt): ResponseReceivedBulkQuoteCmd{
		const cmdPayload: ResponseReceivedBulkQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            bulkQuoteId: evt.payload.bulkQuoteId,
            individualQuoteResults: evt.payload.individualQuoteResults,
            expiration: evt.payload.expiration,
        };
		const cmd = new ResponseReceivedBulkQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

    private _prepareEventToQueryReceiveBulkQuoteCommand(evt: BulkQuoteQueryReceivedEvt): QueryReceivedBulkQuoteCmd {
		const cmdPayload: QueryReceivedBulkQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            bulkQuoteId: evt.payload.bulkQuoteId,
        };
		const cmd = new QueryReceivedBulkQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

    private _prepareEventToRejectBulkQuoteCommand(evt: BulkQuoteRejectedEvt): RejectedBulkQuoteCmd {
		const cmdPayload: RejectedBulkQuoteCmdPayload = {
            requesterFspId: evt.payload.requesterFspId,
			destinationFspId: evt.payload.destinationFspId,
            bulkQuoteId: evt.payload.bulkQuoteId,
            errorInformation: evt.payload.errorInformation,
        };
		const cmd = new RejectedBulkQuoteCmd(cmdPayload);
		cmd.fspiopOpaqueState = evt.fspiopOpaqueState;
		return cmd;
	}

	async stop():Promise<void>{
		await this._messageConsumer.stop();
	}
}
