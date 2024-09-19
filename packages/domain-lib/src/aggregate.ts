/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
**/

"use strict";

import {
    BulkQuoteAcceptedEvt,
    BulkQuoteAcceptedEvtPayload,
    BulkQuotePendingReceivedEvt,
    BulkQuoteQueryReceivedEvt,
    BulkQuoteQueryResponseEvt,
    BulkQuoteQueryResponseEvtPayload,
    BulkQuoteReceivedEvt,
    BulkQuoteReceivedEvtPayload,
    BulkQuoteRequestedEvt,
    BulkQuoteRejectedEvt,
    BulkQuoteRejectedResponseEvt,
    BulkQuoteRejectedResponseEvtPayload,
    QuoteRejectedEvt,
    QuoteRejectedResponseEvt,
    QuoteRejectedResponseEvtPayload,
    QuoteBCBulkQuoteExpiredErrorEvent,
    QuoteBCBulkQuoteExpiredErrorPayload,
    QuoteBCBulkQuoteNotFoundErrorEvent,
    QuoteBCBulkQuoteNotFoundErrorPayload,
    QuoteBCDestinationParticipantNotFoundErrorEvent,
    QuoteBCDestinationParticipantNotFoundErrorPayload,
    QuoteBCRequiredDestinationParticipantIdMismatchErrorEvent,
    QuoteBCRequiredDestinationParticipantIdMismatchErrorPayload,
    QuoteBCRequiredRequesterParticipantIdMismatchErrorPayload,
    QuoteBCRequiredRequesterParticipantIdMismatchErrorEvent,
    QuoteBCInvalidBulkQuoteLengthErrorEvent,
    QuoteBCInvalidBulkQuoteLengthErrorPayload,
    QuoteBCInvalidDestinationFspIdErrorEvent,
    QuoteBCInvalidDestinationFspIdErrorPayload,
    QuoteBCInvalidMessagePayloadErrorEvent,
    QuoteBCMessageNotCommandTypeErrorPayload,
    QuoteBCMessageNotCommandTypeErrorEvent,
    QuoteBCMissingMessageNameErrorEventPayload,
    QuoteBCMissingMessageNameErrorEvent,
    QuoteBCInvalidMessagePayloadErrorPayload,
    QuoteBCInvalidMessageTypeErrorEvent,
    QuoteBCInvalidMessageTypeErrorPayload,
    QuoteBCInvalidRequesterFspIdErrorEvent,
    QuoteBCInvalidRequesterFspIdErrorPayload,
    QuoteBCQuoteExpiredErrorEvent,
    QuoteBCQuoteExpiredErrorPayload,
    QuoteBCQuoteNotFoundErrorEvent,
    QuoteBCQuoteNotFoundErrorPayload,
    QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent,
    QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload,
    QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent,
    QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload,
    QuoteBCRequesterParticipantNotFoundErrorEvent,
    QuoteBCRequesterParticipantNotFoundErrorPayload,
    QuoteBCRequiredDestinationParticipantIsNotApprovedErrorEvent,
    QuoteBCRequiredDestinationParticipantIsNotApprovedErrorPayload,
    QuoteBCRequiredRequesterParticipantIsNotApprovedErrorEvent,
    QuoteBCRequiredRequesterParticipantIsNotApprovedErrorPayload,
    QuoteBCRequiredDestinationParticipantIsNotActiveErrorEvent,
    QuoteBCRequiredDestinationParticipantIsNotActiveErrorPayload,
    QuoteBCRequiredRequesterParticipantIsNotActiveErrorEvent,
    QuoteBCRequiredRequesterParticipantIsNotActiveErrorPayload,
    QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent,
    QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload,
    QuoteBCUnableToAddQuoteToDatabaseErrorEvent,
    QuoteBCUnableToAddQuoteToDatabaseErrorPayload,
    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent,
    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload,
    QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent,
    QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload,
    QuoteBCUnknownErrorEvent,
    QuoteBCUnknownErrorPayload,
    QuoteBCUnableToStoreQuotesInDatabasePayload,
    QuoteBCUnableToStoreQuotesInDatabaseEvent,
    QuoteQueryReceivedEvt,
    QuoteQueryResponseEvt,
    QuoteQueryResponseEvtPayload,
    QuoteRequestAcceptedEvt,
    QuoteRequestAcceptedEvtPayload,
    QuoteRequestReceivedEvt,
    QuoteResponseAcceptedEvt,
    QuoteResponseAcceptedEvtPayload,
    QuoteResponseReceivedEvt,
    QuoteBCUnableToGetQuoteFromDatabaseErrorEvent,
    QuoteBCUnableToGetBulkQuoteFromDatabaseErrorEvent,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
    BulkQuoteNotFoundError,
    InvalidMessagePayloadError,
    InvalidMessageTypeError,
    UnableToAddBatchQuoteError,
    UnableToAddBulkQuoteError,
    UnableToGetBatchQuotesError,
    UnableToUpdateBatchQuotesError,
    UnableToUpdateBulkQuoteError,
} from "./errors";
import {
    CommandMsg,
    DomainEventMsg,
    IDomainMessage,
    IMessage,
    IMessageProducer,
    MessageTypes,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    IAccountLookupService,
    IBulkQuoteRepo,
    IParticipantService,
    IQuoteRepo,
} from "./interfaces/infrastructure";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import {
    IBulkQuote,
    IGeoCode,
    IMoney,
    IQuote,
    QuoteState,
    QuotingErrorCodeNames
} from "@mojaloop/quoting-bc-public-types-lib";
import { BulkQuote, Quote } from "./entities";
import { Currency } from "@mojaloop/platform-configuration-bc-public-types-lib";
import {
    ICounter,
    IHistogram,
    IMetrics,
    ITracing,
    SpanStatusCode,
    Tracer
} from "@mojaloop/platform-shared-lib-observability-types-lib";
import { 
    QueryReceivedBulkQuoteCmd,
    QueryReceivedQuoteCmd,
    RejectedBulkQuoteCmd,
    RejectedQuoteCmd,
    RequestReceivedBulkQuoteCmd,
    RequestReceivedQuoteCmd,
    ResponseReceivedBulkQuoteCmd,
    ResponseReceivedQuoteCmd 
} from "./commands";

export class QuotingAggregate {
    private readonly _logger: ILogger;
    private readonly _quotesRepo: IQuoteRepo;
    private readonly _bulkQuotesRepo: IBulkQuoteRepo;
    private readonly _messageProducer: IMessageProducer;
    private readonly _participantService: IParticipantService;
    private readonly _accountLookupService: IAccountLookupService;
    private readonly _passThroughMode: boolean;
    private readonly _currencyList: Currency[];

    private _metrics: IMetrics;
    private _histo: IHistogram;
    private _commandsCounter:ICounter;
    protected readonly _tracingClient:ITracing;
    protected readonly _tracer: Tracer;

    private _quotesCache: Map<string, IQuote> = new Map<string, IQuote>();
    private _bulkQuotesCache: Map<string, IBulkQuote> = new Map<string, IBulkQuote>();
    private _batchCommands: Map<string, IDomainMessage> = new Map<string, IDomainMessage>();
    private _outputEvents: DomainEventMsg[] = [];

    constructor(
        logger: ILogger,
        quoteRepo: IQuoteRepo,
        bulkQuoteRepo: IBulkQuoteRepo,
        messageProducer: IMessageProducer,
        participantService: IParticipantService,
        accountLookupService: IAccountLookupService,
        metrics: IMetrics,
        passThroughMode: boolean,
        currencyList: Currency[],
        tracingClient:ITracing
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._quotesRepo = quoteRepo;
        this._bulkQuotesRepo = bulkQuoteRepo;
        this._messageProducer = messageProducer;
        this._participantService = participantService;
        this._accountLookupService = accountLookupService;
        this._passThroughMode = passThroughMode ?? false;
        this._currencyList = currencyList;

        this._tracingClient = tracingClient;
        this._tracer = tracingClient.trace.getTracer(this.constructor.name);

        this._histo = metrics.getHistogram("QuotingAggregate", "QuotingAggregate calls", ["callName", "success"]);
        this._commandsCounter = metrics.getCounter("QuotingAggregate_CommandsProcessed", "Commands processed by the Quoting Aggregate", ["commandName"]);
    }

    async processCommandBatch(cmdMessages: CommandMsg[]): Promise<void> {
        const startTime = Date.now();
        this._outputEvents = [];
        this._batchCommands.clear();

        try {
            // execute starts
            const execStarts_timerEndFn = this._histo.startTimer({ callName: "processCommandBatch"});
            for (const cmd of cmdMessages) {
                if(cmd.msgType !== MessageTypes.COMMAND) continue;

                this._histo.observe({callName:"msgDelay"}, (startTime - cmd.msgTimestamp)/1000);

                await this._processCommand(cmd);

                if(cmd.payload && cmd.payload.bulkQuoteId) {
                    if(cmd.msgName === RequestReceivedBulkQuoteCmd.name) {
                        this._commandsCounter.inc({commandName: cmd.msgName}, cmd.payload.individualQuotes.length);
                    } else if(cmd.msgName === ResponseReceivedBulkQuoteCmd.name) {
                        this._commandsCounter.inc({commandName: cmd.msgName}, cmd.payload.individualQuoteResults.length);
                    }
                } else {
                    this._commandsCounter.inc({commandName: cmd.msgName}, 1);
                }

            }
            execStarts_timerEndFn({success:"true"});

            // flush in mem repositories only when no errors happened
            await this._flush();
        } catch (err: unknown) {
            const error = (err as Error).message;
            this._logger.error(err, error);
            throw error;
        } finally {
            if(this._outputEvents.length>0) {
                const publish_timerEndFn = this._histo.startTimer({callName: "publishOutputEvents"});
                await this._messageProducer.send(this._outputEvents);
                publish_timerEndFn({success: "true"});
            }
        }
    }

    private async _flush():Promise<void>{
        const timerEndFn = this._histo.startTimer({callName: "flush"});

        if(this._quotesCache.size){
            const entries = Array.from(this._quotesCache.values());
            try {
                await this._quotesRepo.storeQuotes(entries);
            } catch (error: unknown) {
                this._logger.error(
                    "Error adding quotes to database",
                    error
                );
                const errorPayload: QuoteBCUnableToStoreQuotesInDatabasePayload =
                    {
                        errorCode: QuotingErrorCodeNames.UNABLE_TO_STORE_QUOTES,
                    };
                const errorEvent =
                    new QuoteBCUnableToStoreQuotesInDatabaseEvent(
                        errorPayload
                    );
                this._outputEvents.push(errorEvent);
                timerEndFn({ success: "false" });
                return;
            }
            this._quotesCache.clear();
        }

        timerEndFn({success: "true"});
    }

    private async _processCommand(cmd: CommandMsg): Promise<void> {
        // validate message
        const invalidMessageErrorEvent = this._ensureValidMessage(cmd);

        if (invalidMessageErrorEvent) {
            invalidMessageErrorEvent.tracingInfo = cmd.tracingInfo;
            this._outputEvents.push(invalidMessageErrorEvent);
            return;
        }

        // cache command for later retrieval in continue methods - do this first!
        if(cmd.payload.bulkQuoteId) {
            let quotes = [];

            if(cmd.msgName === BulkQuoteRequestedEvt.name) {
                quotes = cmd.payload.individualQuotes;
            } else if(cmd.msgName === BulkQuotePendingReceivedEvt.name) {
                quotes = cmd.payload.individualQuoteResults;
            }
            for(let i=0 ; i<quotes.length ; i+=1) {
                const individualQuote = quotes[i];
                this._batchCommands.set(quotes[i].quoteId, { ...cmd, ...individualQuote });
            }
        } else {
            this._batchCommands.set(cmd.payload.quoteId, cmd);
        }

        const context = this._tracingClient.propagationExtract(cmd.tracingInfo);
        const parentSpan = this._tracer.startSpan("processCommand", {}, context);
        parentSpan.setAttributes({
            "msgName": cmd.msgName,
            "quoteId": cmd.payload.quoteId
        });

        if (cmd.msgName === RequestReceivedQuoteCmd.name) {
            await this._handleQuoteRequest(cmd as RequestReceivedQuoteCmd);
        } else if (cmd.msgName === ResponseReceivedQuoteCmd.name) {
            await this._handleQuoteResponse(cmd as ResponseReceivedQuoteCmd);
        } else if (cmd.msgName === QueryReceivedQuoteCmd.name) {
            await this._handleQuoteQuery(cmd as QueryReceivedQuoteCmd);
        } else if (cmd.msgName === RejectedQuoteCmd.name) {
            await this._handleQuoteRejected(cmd as RejectedQuoteCmd);
        } else if (cmd.msgName === RequestReceivedBulkQuoteCmd.name) {
            await this._handleBulkQuoteRequest(cmd as RequestReceivedBulkQuoteCmd);
        } else if (cmd.msgName === ResponseReceivedBulkQuoteCmd.name) {
            await this._handleBulkQuoteResponse(cmd as ResponseReceivedBulkQuoteCmd);
        } else if (cmd.msgName === QueryReceivedBulkQuoteCmd.name) {
            await this._handleGetBulkQuoteQuery(cmd as QueryReceivedBulkQuoteCmd);
        } else if (cmd.msgName === RejectedBulkQuoteCmd.name) {
            await this._handleBulkQuoteRejected(cmd as RejectedBulkQuoteCmd);
        } else {
            parentSpan.setStatus({ code: SpanStatusCode.ERROR });
			const errorMessage = `Command type is unknown: ${cmd.msgName}`;
            this._logger.error(errorMessage);

            const errorCode = QuotingErrorCodeNames.COMMAND_TYPE_UNKNOWN;
            const errorEvent = new QuoteBCInvalidMessageTypeErrorEvent({
                errorCode: errorCode,
            });
            errorEvent.inboundProtocolType = cmd.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = cmd.inboundProtocolOpaqueState;
            this._outputEvents.push(errorEvent);
        }

        parentSpan.end();
    }

    private _ensureValidMessage(message: CommandMsg): null | DomainEventMsg {
        if (!message.payload) {
            const errorMessage = "Message payload is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidMessagePayloadErrorPayload = {
                errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_PAYLOAD,
            };

            const errorEvent = new QuoteBCInvalidMessagePayloadErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        if (!message.msgName) {
            const errorMessage = "Message name is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCMissingMessageNameErrorEventPayload = {
                errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_NAME,
            };
            const errorEvent = new QuoteBCMissingMessageNameErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        if (message.msgType !== MessageTypes.COMMAND) {
            const errorMessage = `QuotingCommandHandler: message type is invalid : ${message.msgType}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCMessageNotCommandTypeErrorPayload = {
                errorCode: QuotingErrorCodeNames.MESSAGE_TYPE_NOT_COMMAND,
            };
            const errorEvent = new QuoteBCMessageNotCommandTypeErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        return null;
    }

    //#region Quotes
    //#region _handleQuoteRequest
    private async _handleQuoteRequest(message: RequestReceivedQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({callName: "handleQuoteRequest"});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleQuoteRequest() - Got _handleQuoteRequest msg for quoteId: ${message.payload.quoteId}`);

        const quoteId = message.payload.quoteId;

        const requesterFspId = message.payload.payer?.partyIdInfo?.fspId; 
        let destinationFspId = message.payload.payee?.partyIdInfo?.fspId;
        const expirationDate = message.payload.expiration ?? null;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId as string,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const isCurrencyValid = this._validateCurrency(message);
        if (!isCurrencyValid) {
            const errorPayload: QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload =
                {
                    quoteId,
                    errorCode: QuotingErrorCodeNames.RULE_SCHEME_VIOLATED_REQUEST,
                };
            const errorEvent =
                new QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent(
                    errorPayload
                );
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        if (!destinationFspId) {
            const payeePartyId = message.payload.payee?.partyIdInfo?.partyIdentifier ?? null;
            const payeePartyType = message.payload.payee?.partyIdInfo?.partyIdType ?? null;
            const currency = message.payload.amount?.currency ?? null;
            this._logger.debug(
                `Get destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`
            );
            const timerEndFn_getAccountLookup = this._histo.startTimer({callName: "_handleQuoteRequest.getAccountLookup"});
            try {
                destinationFspId = await this._accountLookupService.getAccountLookup(
                    payeePartyType,
                    payeePartyId,
                    currency
                );
                this._logger.isDebugEnabled() && this._logger.debug(
                    `Got destinationFspId: ${destinationFspId} from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`
                );
                timerEndFn_getAccountLookup({success: "true"});
            } catch (error: unknown) {
                timerEndFn_getAccountLookup({success: "false"});
                destinationFspId = null;
                this._logger.error(
                    `Error while getting destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`,
                    error
                );
            }
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );

        if (destinationParticipantError) {
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        if (expirationDate) {
            const expirationDateValidationError =
                this._validateQuoteExpirationDateOrGetErrorEvent(
                    quoteId,
                    expirationDate
                );
            if (expirationDateValidationError) {
                this._outputEvents.push(expirationDateValidationError);
                timerEndFn({ success: "false" });
                return;
            }
        }

        const now = Date.now();

        const quote: Quote = {
            createdAt: now,
            updatedAt: now,
            quoteId: message.payload.quoteId,
            bulkQuoteId: null,
            requesterFspId: requesterFspId as string, // TODO: It will fail before reaching here if null but refactor in order not to do this
            destinationFspId: destinationFspId as string, // TODO: It will fail before reaching here if null but refactor in order not to do this
            transactionId: message.payload.transactionId,
            // TODO: correct in shared tip libs
            payee: message.payload.payee,
            payer: message.payload.payer,
            amountType: message.payload.amountType,
            amount: message.payload.amount,
            transactionType: message.payload.transactionType,
            feesPayer: message.payload.fees,
            transactionRequestId: message.payload.transactionRequestId,
            geoCode: message.payload.geoCode,
            note: message.payload.note,
            expiration: message.payload.expiration,
            payeeReceiveAmount: null,
            payeeFspFee: null,
            payeeFspCommission: null,
            status: QuoteState.PENDING,
            totalTransferAmount: null,
            errorInformation: null,
            transferAmount: message.payload.amount,
            extensions: message.payload.extensions,
            // Protocol Specific
            inboundProtocolType: message.inboundProtocolType,
            inboundProtocolOpaqueState: message.inboundProtocolOpaqueState,
        };

        if (!this._passThroughMode) {
            this._quotesCache.set(quote.quoteId, quote);
        }

        const payee = message.payload.payee;
        if (!payee.partyIdInfo.fspId) {
            payee.partyIdInfo.fspId = destinationFspId;
        }

        const payload: QuoteRequestAcceptedEvtPayload = {
            quoteId: message.payload.quoteId,
            transactionId: message.payload.transactionId,
            transactionRequestId: message.payload.transactionRequestId,
            payee: payee,
            payer: message.payload.payer,
            amountType: message.payload.amountType,
            amount: message.payload.amount,
            fees: message.payload.fees,
            transactionType: message.payload.transactionType,
            geoCode: message.payload.geoCode,
            note: message.payload.note,
            expiration: message.payload.expiration,
            converter: message.payload.converter,
            currencyConversion: message.payload.currencyConversion,
            extensions: message.payload.extensions,
        };

        const event = new QuoteRequestAcceptedEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;


        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`quoteRequestReceived() - completed for quoteId: ${quote.quoteId}`);
    }
    //#endregion

    //#region _handleQuoteResponse
    private async _handleQuoteResponse(message: ResponseReceivedQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleQuoteResponse",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleQuoteResponse() - Got _handleQuoteResponse msg for quoteId: ${message.payload.quoteId}`);

        let quote: IQuote | null = null;
        try {
			quote = await this._getQuote(message.payload.quoteId);
		} catch(err: unknown) {
			const error = (err as Error).message;
			const errorMessage = `Unable to get quote record for quoteId: ${message.payload.quoteId} from repository`;
			this._logger.error(err, `${errorMessage}: ${error}`);
            const errorCode = QuotingErrorCodeNames.UNABLE_TO_GET_QUOTE;
            const errorEvent = new QuoteBCUnableToGetQuoteFromDatabaseErrorEvent({
                quoteId: message.payload.quoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            return;
		}

        if(!quote) {
            const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
                quoteId: message.payload.quoteId,
                errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCQuoteNotFoundErrorEvent(errorPayload);
            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const quoteId = message.payload.quoteId;

        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId = message.payload.destinationFspId;
        const expirationDate = message.payload.expiration ?? null;
        let quoteErrorEvent: DomainEventMsg | null = null;
        let quoteStatus: QuoteState = QuoteState.ACCEPTED;

        const isCurrencyValid = this._validateCurrency(message);
        if (!isCurrencyValid) {
            const errorPayload: QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload =
                {
                    errorCode: QuotingErrorCodeNames.RULE_SCHEME_VIOLATED_REQUEST,
                    quoteId,
                };
            quoteErrorEvent =
                new QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent(
                    errorPayload
                );
            this._logger.error(
                `Quote ${quoteId} rejected due to scheme validation error`
            );
            quoteStatus = QuoteState.REJECTED;
            quote.status = quoteStatus;
            if(!this._passThroughMode) {
                this._quotesCache.set(quote.quoteId, quote);
            }
            this._outputEvents.push(quoteErrorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        if (quoteErrorEvent === null) {
            const requesterParticipantError =
                await this._validateRequesterParticipantInfoOrGetErrorEvent(
                    requesterFspId,
                    quoteId,
                    null
                );
            if (requesterParticipantError) {
                quoteErrorEvent = requesterParticipantError;
                quoteStatus = QuoteState.REJECTED;
                this._logger.error(
                    `Quote ${quoteId} rejected due to requester participant error`
                );

                quote.status = quoteStatus;
                if(!this._passThroughMode) {
                    this._quotesCache.set(quote.quoteId, quote);
                }
                this._outputEvents.push(quoteErrorEvent);
                timerEndFn({ success: "false" });
                return;
            }
        }

        if (quoteErrorEvent === null) {
            const destinationParticipantError =
                await this._validateDestinationParticipantInfoOrGetErrorEvent(
                    destinationFspId,
                    quoteId,
                    null
                );
            if (destinationParticipantError) {
                quoteErrorEvent = destinationParticipantError;
                quoteStatus = QuoteState.REJECTED;

                quote.status = quoteStatus;
                if(!this._passThroughMode) {
                    this._quotesCache.set(quote.quoteId, quote);
                }
                this._outputEvents.push(quoteErrorEvent);
                timerEndFn({ success: "false" });
                return;
            }
        }

        if (quoteErrorEvent === null) {
            const expirationDateError =
                this._validateQuoteExpirationDateOrGetErrorEvent(
                    quoteId,
                    expirationDate
                );
            if (expirationDateError) {
                quoteErrorEvent = expirationDateError;
                quoteStatus = QuoteState.EXPIRED;

                quote.status = quoteStatus;
                if(!this._passThroughMode) {
                    this._quotesCache.set(quote.quoteId, quote);
                }
                this._outputEvents.push(expirationDateError);
                timerEndFn({ success: "false" });
                return;
            }
        }

        if (!this._passThroughMode) {
            const updatedQuote: Partial<Quote> = {
                quoteId: message.payload.quoteId,
                expiration: message.payload.expiration,
                note: message.payload.note,
                geoCode: message.payload.geoCode,
                payeeFspCommission: message.payload.payeeFspCommission,
                payeeFspFee: message.payload.payeeFspFee,
                payeeReceiveAmount: message.payload.payeeReceiveAmount,
                transferAmount: message.payload.transferAmount,
                status: quoteStatus,
                extensions: message.payload.extensions,
                // Protocol Specific
                inboundProtocolType: message.inboundProtocolType,
                inboundProtocolOpaqueState: message.inboundProtocolOpaqueState,
            };

            this._quotesCache.set(message.payload.quoteId, {
                ...quote,
                ...updatedQuote
            });
        }

        // Return error event if previous validations failed
        if (quoteErrorEvent !== null) {
            this._outputEvents.push(quoteErrorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const payload: QuoteResponseAcceptedEvtPayload = {
            quoteId: message.payload.quoteId,
            transferAmount: message.payload.transferAmount,
            expiration: message.payload.expiration,
            note: message.payload.note,
            payeeReceiveAmount: message.payload.payeeReceiveAmount,
            payeeFspFee: message.payload.payeeFspFee,
            payeeFspCommission: message.payload.payeeFspCommission,
            geoCode: message.payload.geoCode,
            extensions: message.payload.extensions
        };
        //TODO: add evt to name
        const event = new QuoteResponseAcceptedEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`quoteResponseReceived() - completed for quoteId: ${message.payload.quoteId}`);

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug("_handleQuoteResponse() - complete");
    }
    //#endregion

    //#region handleQuoteQuery
    private async _handleQuoteQuery(message: QueryReceivedQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "_handleQuoteQuery",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleQuoteQuery() - Got _handleQuoteQuery msg for quoteId: ${message.payload.quoteId}`);

        const quoteId = message.payload.quoteId;

        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId = message.payload.destinationFspId;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );
        if (destinationParticipantError) {
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        let quote: IQuote | null = null;
        try {
			quote = await this._getQuote(message.payload.quoteId);
		} catch(err: unknown) {
			const error = (err as Error).message;
			const errorMessage = `Unable to get quote record for quoteId: ${message.payload.quoteId} from repository`;
			this._logger.error(err, `${errorMessage}: ${error}`);
            const errorCode = QuotingErrorCodeNames.UNABLE_TO_GET_QUOTE;
            const errorEvent = new QuoteBCUnableToGetQuoteFromDatabaseErrorEvent({
                quoteId: message.payload.quoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            return;
		}

        if (!quote) {
            const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
                quoteId,
                errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCQuoteNotFoundErrorEvent(errorPayload);
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const payload: QuoteQueryResponseEvtPayload = {
            quoteId: quote.quoteId,
            transferAmount: quote.transferAmount as IMoney,
            expiration: quote.expiration as string,
            note: quote.note,
            payeeReceiveAmount: quote.amount,
            payeeFspFee: quote.payeeFspFee,
            geoCode: quote.geoCode as IGeoCode,
            payeeFspCommission: quote.payeeFspCommission as IMoney,
            extensions: quote.extensions,
        };

        const event = new QuoteQueryResponseEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`quoteQueryReceived() - completed for quoteId: ${message.payload.quoteId}`);
    }
    //#endregion

    //#region handleGetQuoteQueryRejected
    private async _handleQuoteRejected(message: RejectedQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleQuoteRejected",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleQuoteRejected() - Got _handleQuoteRejected msg for quoteId: ${message.payload.quoteId}`);

        const quoteId = message.payload.quoteId;
        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId = message.payload.destinationFspId;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            this._logger.error(
                `Invalid participant info for requesterFspId: ${requesterFspId}`
            );
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );
        if (destinationParticipantError) {
            this._logger.error(
                `Invalid participant info for destinationFspId: ${destinationFspId}`
            );
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        let quote:IQuote | null = null;

		try {
			quote = await this._getQuote(message.payload.quoteId);
		} catch(err: unknown) {
			const error = (err as Error).message;
			const errorMessage = `Unable to get quote record for quoteId: ${message.payload.quoteId} from repository`;
			this._logger.error(err, `${errorMessage}: ${error}`);
            const errorCode = QuotingErrorCodeNames.UNABLE_TO_GET_QUOTE;
            const errorEvent = new QuoteBCUnableToGetQuoteFromDatabaseErrorEvent({
				quoteId: message.payload.quoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            return;
		}

		if(!quote) {
			const errorMessage = `QuoteId: ${message.payload.quoteId} could not be found`;
			this._logger.error(errorMessage);
            const errorCode = QuotingErrorCodeNames.QUOTE_NOT_FOUND;
            const errorEvent = new QuoteBCQuoteNotFoundErrorEvent({
				quoteId: message.payload.quoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            return;
		}

        const payload: QuoteRejectedResponseEvtPayload = {
            quoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new QuoteRejectedResponseEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`quoteRejected() - completed for quoteId: ${message.payload.quoteId}`);
    }
    //#endregion
    //#endregion

    //#region BulkQuotes
    //#region _handleBulkQuoteRequest
    private async _handleBulkQuoteRequest(message: RequestReceivedBulkQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleBulkQuoteRequest",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleBulkQuoteRequest() - Got _handleBulkQuoteRequest msg for bulkQuoteId: ${message.payload.bulkQuoteId}`);

        const bulkQuoteId = message.payload.bulkQuoteId;

        const requesterFspId = message.payload.requesterFspId ?? null;
        const expirationDate = message.payload.expiration ?? null;
        const individualQuotesInsideBulkQuote =
            (message.payload.individualQuotes as unknown as IQuote[]) ?? [];

        if (individualQuotesInsideBulkQuote.length <= 0) {
            const errorPayload: QuoteBCInvalidBulkQuoteLengthErrorPayload = {
                errorCode: QuotingErrorCodeNames.INVALID_BULK_QUOTE_LENGTH,
                bulkQuoteId,
            };
            const errorEvent = new QuoteBCInvalidBulkQuoteLengthErrorEvent(
                errorPayload
            );
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        let destinationFspId: string | null = message.payload.destinationFspId;

        if (!destinationFspId) {
            for await (const quote of individualQuotesInsideBulkQuote) {
                const payeePartyId =
                    quote.payee?.partyIdInfo?.partyIdentifier ?? null;
                const payeePartyType =
                    quote.payee?.partyIdInfo?.partyIdType ?? null;

                if (
                    !quote.payee.partyIdInfo.fspId &&
                    payeePartyId &&
                    payeePartyType
                ) {
                    const currency = quote.amount?.currency ?? null;
                    this._logger.debug(
                        `Getting destinationFspId for payeePartyId: ${payeePartyId}, and payeePartyType: ${payeePartyType}, and currency :${currency} from account lookup service for bulkQuote: ${bulkQuoteId} `
                    );
                    destinationFspId = await this._accountLookupService
                        .getAccountLookup(
                            payeePartyType,
                            payeePartyId,
                            currency
                        )
                        .catch((error) => {
                            this._logger.error(
                                `Error getting destinationFspId from account lookup service for bulkQuote: ${bulkQuoteId}`,
                                error
                            );
                            return null;
                        });
                }

                if (destinationFspId) {
                    this._logger.debug(
                        `Got destinationFspId from account lookup service: ${
                            destinationFspId ?? null
                        }`
                    );
                    this._logger.debug(
                        `Got destinationFspId from account lookup service: ${destinationFspId}`
                    );
                    break;
                }
            }
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        if (expirationDate) {
            const expirationDateError =
                this._validateBulkQuoteExpirationDateOrGetErrorEvent(
                    bulkQuoteId,
                    expirationDate
                );
            if (expirationDateError) {
                this._outputEvents.push(expirationDateError);
                timerEndFn({ success: "false" });
                return;
            }
        }

        const now = Date.now();

        const bulkQuote: BulkQuote = {
            createdAt: now,
            updatedAt: now,
            bulkQuoteId: bulkQuoteId,
            payer: message.payload.payer,
            geoCode: message.payload.geoCode,
            expiration: message.payload.expiration,
            individualQuotes: individualQuotesInsideBulkQuote as IQuote[],
            quotesNotProcessedIds: [],
            status: QuoteState.PENDING,
            extensions: message.payload.extensions,
            // Protocol Specific
            inboundProtocolType: message.inboundProtocolType,
            inboundProtocolOpaqueState: message.inboundProtocolOpaqueState,
        };

        if (!this._passThroughMode) {
            try {
                await this._addBulkQuote(bulkQuote);
            } catch (error: unknown) {
                const errorMessage = `Error adding bulk quote ${bulkQuoteId} to database`;
                this._logger.error(errorMessage, error);
                const errorPayload: QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload =
                    {
                        errorCode: QuotingErrorCodeNames.UNABLE_TO_ADD_BULK_QUOTE,
                        bulkQuoteId,
                    };
                const errorEvent =
                    new QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent(
                        errorPayload
                    );
                this._outputEvents.push(errorEvent);
                timerEndFn({ success: "false" });
                return;
            }
        }

        const payload: BulkQuoteReceivedEvtPayload = {
            bulkQuoteId,
            payer: message.payload.payer,
            geoCode: message.payload.geoCode,
            expiration: expirationDate,
            individualQuotes: individualQuotesInsideBulkQuote,
            extensions: message.payload.extensions,
        };

        const event = new BulkQuoteReceivedEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        if (!this._passThroughMode) {
            try {
                await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
            } catch(err: unknown) {
                const error = (err as Error).message;
                const errorMessage = `Unable to add bulkQuote record for bulkQuoteId: ${message.payload.bulkQuoteId} to repository`;
                this._logger.error(err, `${errorMessage}: ${error}`);
                const errorPayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
                {
                    errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
                    bulkQuoteId,
                };
                const errorEvent =
                new QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent(
                    errorPayload
                );

                errorEvent.inboundProtocolType = message.inboundProtocolType;
                errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
                errorEvent.tracingInfo = message.tracingInfo;
                this._outputEvents.push(errorEvent);
                timerEndFn({ success: "false" });
                return;
            }
        }

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`bulkQuoteRequestReceived() - completed for bulkQuoteId: ${message.payload.bulkQuoteId}`);
    }

    //#endregion

    //#region _handleBulkQuoteResponse
    private async _handleBulkQuoteResponse(message: ResponseReceivedBulkQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleBulkQuoteResponse",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleBulkQuoteResponse() - Got _handleBulkQuoteResponse msg for bulkQuoteId: ${message.payload.bulkQuoteId}`);

        let bulkQuote: IBulkQuote | null = null;
        try {
			bulkQuote = await this._getBulkQuote(message.payload.bulkQuoteId);
		} catch(err: unknown) {
			const error = (err as Error).message;
			const errorMessage = `Unable to get bulkQuote record for bulkQuoteId: ${message.payload.bulkQuoteId} from repository`;
			this._logger.error(err, `${errorMessage}: ${error}`);
            const errorCode = QuotingErrorCodeNames.UNABLE_TO_GET_QUOTE;
            const errorEvent = new QuoteBCUnableToGetBulkQuoteFromDatabaseErrorEvent({
                bulkQuoteId: message.payload.bulkQuoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            return;
		}

        if(!bulkQuote) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId: message.payload.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(errorPayload);
            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const bulkQuoteId = message.payload.bulkQuoteId;

        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId = message.payload.destinationFspId;
        const expirationDate = message.payload.expiration ?? null;

        let bulkQuoteErrorEvent: DomainEventMsg | null = null;
        let quoteStatus: QuoteState = QuoteState.ACCEPTED;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            bulkQuoteErrorEvent = requesterParticipantError;
            quoteStatus = QuoteState.REJECTED;
        }

        if (bulkQuoteErrorEvent === null) {
            const destinationParticipantError =
                await this._validateDestinationParticipantInfoOrGetErrorEvent(
                    destinationFspId,
                    null,
                    bulkQuoteId
                );
            if (destinationParticipantError) {
                bulkQuoteErrorEvent = destinationParticipantError;
                quoteStatus = QuoteState.REJECTED;
            }
        }

        if (bulkQuoteErrorEvent === null && expirationDate) {
            const expirationDateError =
                this._validateBulkQuoteExpirationDateOrGetErrorEvent(
                    bulkQuoteId,
                    expirationDate
                );
            if (expirationDateError) {
                bulkQuoteErrorEvent = expirationDateError;
                quoteStatus = QuoteState.EXPIRED;
            }
        }

        const quotes =
            (message.payload.individualQuoteResults as IQuote[]) ?? [];

        if (!this._passThroughMode) {
            try {
                await this._updateBulkQuote(
                    bulkQuoteId,
                    requesterFspId,
                    destinationFspId as string, // TODO: Same reason as in quote request, it will fail before reaching here if but refactor in order not to do this
                    quoteStatus,
                    quotes
                );
            } catch (error: unknown) {
                const errorMessage = `Error updating bulk quote ${bulkQuoteId} in database`;
                this._logger.error(errorMessage, error);
                const errorPayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
                    {
                        errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
                        bulkQuoteId,
                    };
                const errorEvent =
                    new QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent(
                        errorPayload
                    );
                this._outputEvents.push(errorEvent);
                timerEndFn({ success: "false" });
                return;
            }
        }

        //If there was any error during prior validation, return the error event
        if (bulkQuoteErrorEvent) {
            try {
                await this._updateBulkQuote(
                    bulkQuoteId,
                    requesterFspId,
                    destinationFspId as string,
                    quoteStatus,
                    quotes
                );
                await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
            } catch(err: unknown) {
                const error = (err as Error).message;
                const errorMessage = `Unable to update bulkQuote record for bulkQuoteId: ${message.payload.bulkQuoteId} to repository`;
                this._logger.error(err, `${errorMessage}: ${error}`);
                const errorCode = QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE;
                const errorEvent = new QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent({
                    bulkQuoteId: message.payload.bulkQuoteId,
                    errorCode: errorCode
                });

                errorEvent.inboundProtocolType = message.inboundProtocolType;
                errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
                errorEvent.tracingInfo = message.tracingInfo;
                this._outputEvents.push(errorEvent);
                timerEndFn({ success: "false" });
                return;
            }

            this._outputEvents.push(bulkQuoteErrorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const payload: BulkQuoteAcceptedEvtPayload = {
            bulkQuoteId: message.payload.bulkQuoteId,
            individualQuoteResults: message.payload.individualQuoteResults,
            expiration: message.payload.expiration,
            extensions: message.payload.extensions,
        };

        const event = new BulkQuoteAcceptedEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        try {
            await this._updateBulkQuote(
                bulkQuoteId,
                requesterFspId,
                destinationFspId as string,
                quoteStatus,
                quotes
            );
            await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
        } catch(err: unknown) {
			const error = (err as Error).message;
			const errorMessage = `Unable to add bulkQuote record for bulkQuoteId: ${message.payload.bulkQuoteId} to repository`;
			this._logger.error(err, `${errorMessage}: ${error}`);
            const errorCode = QuotingErrorCodeNames.UNABLE_TO_ADD_BULK_QUOTE;
            const errorEvent = new QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent({
                bulkQuoteId: message.payload.bulkQuoteId,
				errorCode: errorCode
			});

            errorEvent.inboundProtocolType = message.inboundProtocolType;
            errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
            errorEvent.tracingInfo = message.tracingInfo;
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        this._bulkQuotesCache.clear();
        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`bulkQuoteResponseReceived() - completed for bulkQuoteId: ${message.payload.bulkQuoteId}`);
    }
    //#endregion

    //#region _handleGetBulkQuoteQuery
    private async _handleGetBulkQuoteQuery(message: QueryReceivedBulkQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleGetBulkQuoteQuery",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleGetBulkQuoteQuery() - Got _handleGetBulkQuoteQuery msg for bulkQuoteId: ${message.payload.bulkQuoteId}`);

        const bulkQuoteId = message.payload.bulkQuoteId;

        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId = message.payload.destinationFspId;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        let bulkQuote: IBulkQuote | null = null;

        if (!this._passThroughMode) {
            try {
                bulkQuote = await this._getBulkQuote(message.payload.bulkQuoteId);
            } catch(err: unknown) {
                const error = (err as Error).message;
                const errorMessage = `Unable to get bulkQuote record for bulkQuote: ${message.payload.bulkQuoteId} from repository`;
                this._logger.error(err, `${errorMessage}: ${error}`);
                const errorCode = QuotingErrorCodeNames.UNABLE_TO_GET_BULK_QUOTE;
                const errorEvent = new QuoteBCUnableToGetBulkQuoteFromDatabaseErrorEvent({
                    bulkQuoteId: message.payload.bulkQuoteId,
                    errorCode: errorCode
                });

                errorEvent.inboundProtocolType = message.inboundProtocolType;
                errorEvent.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
                errorEvent.tracingInfo = message.tracingInfo;
                this._outputEvents.push(errorEvent);
                return;
            }
        }

        if (!bulkQuote) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(
                errorPayload
            );
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        let individualQuotes: IQuote[] | null = null;

        if (!this._passThroughMode) {
            individualQuotes = await this._quotesRepo
                .getQuotesByBulkQuoteId(bulkQuoteId)
                .catch((error) => {
                    this._logger.error(
                        `Error getting quotes for Bulk Quote bulkQuoteId: ${bulkQuoteId}`,
                        error
                    );
                    return null;
                });
        }

        //#TODO : change to individual quote error
        if (!individualQuotes || individualQuotes.length <= 0) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.INDIVIDUAL_QUOTES_NOT_FOUND,
            };
            const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(
                errorPayload
            );
            this._outputEvents.push(errorEvent);
            timerEndFn({ success: "false" });
            return;
        }

        const payload: BulkQuoteQueryResponseEvtPayload = {
            bulkQuoteId: bulkQuote.bulkQuoteId,
            individualQuoteResults: individualQuotes as IQuote[],
            expiration: bulkQuote.expiration,
            extensions: bulkQuote.extensions,
        };

        const event = new BulkQuoteQueryResponseEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`bulkQuoteQueryReceived() - completed for bulkQuoteId: ${message.payload.bulkQuoteId}`);
    }

    //#endregion

    //#region _handleBulkQuoteRejected

    private async _handleBulkQuoteRejected(message: RejectedBulkQuoteCmd): Promise<void> {
        /* istanbul ignore next */
		const timerEndFn = this._histo.startTimer({
			callName: "handleBulkQuoteRejected",
		});

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`_handleBulkQuoteRejected() - Got _handleBulkQuoteRejected msg for bulkQuoteId: ${message.payload.bulkQuoteId}`);

        const bulkQuoteId = message.payload.bulkQuoteId;
        const requesterFspId = message.payload.requesterFspId;
        const destinationFspId =
            message.payload.destinationFspId ?? null;

        const requesterParticipantError =
            await this._validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            this._logger.error(
                `Invalid participant info for requesterFspId: ${requesterFspId}`
            );
            this._outputEvents.push(requesterParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const destinationParticipantError =
            await this._validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            this._logger.error(
                `Invalid participant info for destinationFspId: ${destinationFspId}`
            );
            this._outputEvents.push(destinationParticipantError);
            timerEndFn({ success: "false" });
            return;
        }

        const payload: BulkQuoteRejectedResponseEvtPayload = {
            bulkQuoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new BulkQuoteRejectedResponseEvt(payload);
        event.inboundProtocolType = message.inboundProtocolType;
        event.inboundProtocolOpaqueState = message.inboundProtocolOpaqueState;
        event.tracingInfo = message.tracingInfo;

        this._outputEvents.push(event);
        timerEndFn({ success: "true" });

        /* istanbul ignore next */
        this._logger.isDebugEnabled() && this._logger.debug(`bulkQuoteRejected() - completed for bulkQuoteId: ${message.payload.bulkQuoteId}`);
    }
    //#endregion

    //#region Get Cache
    private async _getQuote(id:string):Promise<IQuote | null>{
        const timerEndFn = this._histo.startTimer({callName: "getQuote"});
        let quote: IQuote | null = this._quotesCache.get(id) || null;
        if(quote){
            timerEndFn({ success: "true" });
            return quote;
        }

        quote = await this._quotesRepo.getQuoteById(id);
        if(quote){
            this._quotesCache.set(id, quote);
            timerEndFn({ success: "true" });
            return quote;
        }

        timerEndFn({ success: "true" });
        return null;
    }

    private async _getBulkQuote(id:string):Promise<IBulkQuote | null>{
        let bulkQuote: IBulkQuote | null = this._bulkQuotesCache.get(id) || null;
        if(bulkQuote){
            return bulkQuote;
        }

        bulkQuote = await this._bulkQuotesRepo.getBulkQuoteById(id);
        if(bulkQuote){
            this._bulkQuotesCache.set(id, bulkQuote);
            return bulkQuote;
        }

        return null;
    }
    //#endregion

    //#region Quotes database operations

    private async _addBulkQuote(bulkQuote: IBulkQuote): Promise<void> {
        //Add bulkQuote to database and iterate through quotes to add them to database
        try {
            this._bulkQuotesCache.set(bulkQuote.bulkQuoteId, bulkQuote);
        } catch (err) {
            const errorMessage = `Error adding bulkQuote for bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
            this._logger.error(errorMessage, err);
            throw new UnableToAddBulkQuoteError(errorMessage);
        }

        const quotes = bulkQuote.individualQuotes;
        const now = Date.now();

        // change quote status to Pending for all
        quotes.forEach((quote) => {
            quote.createdAt = now;
            quote.updatedAt = now;
            quote.bulkQuoteId = bulkQuote.bulkQuoteId;
            quote.status = QuoteState.PENDING;

            this._quotesCache.set(quote.quoteId, quote);
        });
    }

    private async _updateBulkQuote(
        bulkQuoteId: string,
        requesterFspId: string,
        destinationFspId: string,
        status: QuoteState,
        quotesReceived: IQuote[]
    ): Promise<void> {
        const bulkQuote = await this._getBulkQuote(bulkQuoteId);

        if (!bulkQuote) {
            const errorMessage = `Bulk Quote not found for bulkQuoteId: ${bulkQuoteId}`;
            this._logger.error(errorMessage);
            throw new BulkQuoteNotFoundError(errorMessage);
        }

        const quotesThatBelongToBulkQuote:IQuote[] = [];

        for(let i=0 ; i < bulkQuote.individualQuotes.length  ; i+=1) {
            const quote = await this._getQuote(bulkQuote.individualQuotes[i].quoteId);

            if(quote) {
                quotesThatBelongToBulkQuote.push(quote);
            }
        }

        const now = Date.now();

        quotesThatBelongToBulkQuote.forEach((quote) => {
            const quoteFromBulkQuoteReceivedInRequest = quotesReceived.find(
                (q) => q.quoteId === quote.quoteId
            );
            if (quoteFromBulkQuoteReceivedInRequest) {
                quote.updatedAt = now;
                quote.status = status;
                quote.requesterFspId = requesterFspId;
                quote.destinationFspId = destinationFspId;
                quote.totalTransferAmount =
                    quoteFromBulkQuoteReceivedInRequest.transferAmount;
                quote.expiration =
                    quoteFromBulkQuoteReceivedInRequest.expiration;
                quote.payeeReceiveAmount =
                    quoteFromBulkQuoteReceivedInRequest.payeeReceiveAmount;
                quote.payeeFspFee =
                    quoteFromBulkQuoteReceivedInRequest.payeeFspFee;
                quote.payeeFspCommission =
                    quoteFromBulkQuoteReceivedInRequest.payeeFspCommission;
                quote.errorInformation =
                    quoteFromBulkQuoteReceivedInRequest.errorInformation;
                quote.extensions =
                    quoteFromBulkQuoteReceivedInRequest.extensions;
                // Protocol Specific
                quote.inboundProtocolType =
                    quoteFromBulkQuoteReceivedInRequest.inboundProtocolType;
                quote.inboundProtocolOpaqueState =
                    quoteFromBulkQuoteReceivedInRequest.inboundProtocolOpaqueState;
            }
        });

        bulkQuote.updatedAt = now;
        bulkQuote.status = status;

        if (quotesThatBelongToBulkQuote.length > 0) {
            for(let i=0 ; i < quotesThatBelongToBulkQuote.length ; i+=1) {
                this._quotesCache.set(quotesThatBelongToBulkQuote[i].quoteId, quotesThatBelongToBulkQuote[i]);
            }
        }

        bulkQuote.individualQuotes = quotesThatBelongToBulkQuote;
        this._bulkQuotesCache.set(bulkQuote.bulkQuoteId, bulkQuote);
    }

    //#endregion

    //#region Validations

    private _validateCurrency(message: IMessage): boolean {
        const currency =
            message.payload.transferAmount?.currency ??
            message.payload.amount?.currency;
        if (!currency) {
            this._logger.error("Currency is not sent in the request");
            return false;
        }

        const currenciesSupported = this._currencyList.find(supportedCurrency => supportedCurrency.code == currency);

        if (!currenciesSupported) {
            this._logger.error("Currency is not supported");
            return false;
        }

        return true;
    }

    private _validateBulkQuoteExpirationDateOrGetErrorEvent(
        bulkQuoteId: string,
        expirationDate: string
    ): DomainEventMsg | null {
        let differenceDate = 0;
        try {
            const serverDateUtc = new Date().toISOString();
            const serverDate = new Date(serverDateUtc);
            const bulkQuoteDate = new Date(expirationDate);
            differenceDate = bulkQuoteDate.getTime() - serverDate.getTime();
        } catch (error) {
            this._logger.error(
                `Error parsing date for bulkQuoteId: ${bulkQuoteId}`,
                error
            );
            const errorPayload: QuoteBCBulkQuoteExpiredErrorPayload = {
                errorCode: QuotingErrorCodeNames.BULK_QUOTE_EXPIRED,
                bulkQuoteId,
                expirationDate,
            };
            const errorEvent = new QuoteBCBulkQuoteExpiredErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        if (differenceDate < 0) {
            const errorMessage = `BulkQuote with id ${bulkQuoteId} has expired on ${expirationDate}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCBulkQuoteExpiredErrorPayload = {
                errorCode: QuotingErrorCodeNames.BULK_QUOTE_EXPIRED,
                bulkQuoteId,
                expirationDate,
            };
            const errorEvent = new QuoteBCBulkQuoteExpiredErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        return null;
    }

    private _validateQuoteExpirationDateOrGetErrorEvent(
        quoteId: string,
        expirationDate: string
    ): DomainEventMsg | null {
        let differenceDate = 0;
        try {
            const serverDateUtc = new Date().toISOString();
            const serverDate = new Date(serverDateUtc);
            const quoteDate = new Date(expirationDate);
            differenceDate = quoteDate.getTime() - serverDate.getTime();
        } catch (error) {
            this._logger.error(
                `Error parsing date for quoteId: ${quoteId}`,
                error
            );
            const errorPayload: QuoteBCQuoteExpiredErrorPayload = {
                errorCode: QuotingErrorCodeNames.QUOTE_EXPIRED,
                quoteId,
                expirationDate,
            };
            const errorEvent = new QuoteBCQuoteExpiredErrorEvent(errorPayload);
            return errorEvent;
        }

        if (differenceDate < 0) {
            const errorMessage = `Quote with id ${quoteId} has expired at ${expirationDate}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCQuoteExpiredErrorPayload = {
                errorCode: QuotingErrorCodeNames.QUOTE_EXPIRED,
                quoteId: quoteId as string,
                expirationDate,
            };
            const errorEvent = new QuoteBCQuoteExpiredErrorEvent(errorPayload);
            return errorEvent;
        }

        return null;
    }

    private async _validateDestinationParticipantInfoOrGetErrorEvent(
        participantId: string | null,
        quoteId: string | null,
        bulkQuoteId: string | null
    ): Promise<DomainEventMsg | null> {
        const timerEndFn = this._histo.startTimer({callName: "validateDestinationParticipantInfoOrGetErrorEvent"});
        let participant: IParticipant | null = null;

        if (!participantId) {
            const errorMessage = "Payee fspId is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
                destinationFspId: participantId as string,
                quoteId,
            };
            const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(
                errorPayload
            );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        const timerEndFn_getParticipant = this._histo.startTimer({callName: "validateDestinationParticipantInfoOrGetErrorEvent.getParticipantInfo"});
        participant = await this._participantService
            .getParticipantInfo(participantId)
            .catch((err: unknown) => {
                timerEndFn({ success: "false" });
                const error = (err as Error).message;
                this._logger.error(`Error getting payee info for id: ${participantId}`,error);
                return null;
            });
        timerEndFn_getParticipant({ success: "true" });

        if (!participant) {
            const errorMessage = `Payee participant not found for participantId: ${participantId}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCDestinationParticipantNotFoundErrorPayload =
                {
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.DESTINATION_PARTICIPANT_NOT_FOUND,
                    destinationFspId: participantId,
                };
            const errorEvent =
                new QuoteBCDestinationParticipantNotFoundErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (participant.id !== participantId) {
            const errorMessage = `Payee participant ${participantId} id mismatch with expected ${participant.id}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredDestinationParticipantIdMismatchErrorPayload =
                {
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH,
                    destinationFspId: participantId,
                    quoteId,
                };
            const errorEvent =
                new QuoteBCRequiredDestinationParticipantIdMismatchErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (!participant.approved) {
            const errorMessage = `Payee participant fspId ${participantId} is not approved`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredDestinationParticipantIsNotApprovedErrorPayload =
                {
                    destinationFspId: participantId,
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED,
                };
            const errorEvent =
                new QuoteBCRequiredDestinationParticipantIsNotApprovedErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (!participant.isActive) {
            const errorMessage = `Payee participant fspId ${participantId} is not active`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredDestinationParticipantIsNotActiveErrorPayload =
                {
                    destinationFspId: participantId,
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE,
                };
            const errorEvent =
                new QuoteBCRequiredDestinationParticipantIsNotActiveErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }
        timerEndFn({ success: "true" });
        return null;
    }

    private async _validateRequesterParticipantInfoOrGetErrorEvent(
        participantId: string,
        quoteId: string | null,
        bulkQuoteId: string | null
    ): Promise<DomainEventMsg | null> {
        const timerEndFn = this._histo.startTimer({callName: "validateRequesterParticipantInfoOrGetErrorEvent"});
        let participant: IParticipant | null = null;

        if (!participantId) {
            const errorMessage = "Payer fspId is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
                requesterFspId: participantId,
                quoteId,
            };
            const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(
                errorPayload
            );
            return errorEvent;
        }


        const timerEndFn_getParticipant = this._histo.startTimer({callName: "validateRequesterParticipantInfoOrGetErrorEvent.getParticipantInfo"});
            participant = await this._participantService
                .getParticipantInfo(participantId)
                .catch((error: Error) => {
                    timerEndFn({ success: "false" });
                    this._logger.error(`Error getting payer info for fspId: ${participantId}`,error);
                    return null;
                });
        timerEndFn_getParticipant({ success: "true" });

        if (!participant) {
            const errorMessage = `Payer participant not found for fspId: ${participantId}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequesterParticipantNotFoundErrorPayload =
                {
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.SOURCE_PARTICIPANT_NOT_FOUND,
                    //TODO: add property
                    requesterFspId: participantId,
                };
            const errorEvent =
                new QuoteBCRequesterParticipantNotFoundErrorEvent(errorPayload);
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (participant.id !== participantId) {
            const errorMessage = `Payer participant fspId ${participantId} mismatch with the one fetched from participant service ${participant.id}`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredRequesterParticipantIdMismatchErrorPayload =
                {
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH,
                    requesterFspId: participantId,
                    quoteId,
                };
            const errorEvent =
                new QuoteBCRequiredRequesterParticipantIdMismatchErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (!participant.approved) {
            const errorMessage = `Payer participant fspId ${participantId} is not approved`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredRequesterParticipantIsNotApprovedErrorPayload =
                {
                    requesterFspId: participantId,
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED,
                };
            const errorEvent =
                new QuoteBCRequiredRequesterParticipantIsNotApprovedErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }

        if (!participant.isActive) {
            const errorMessage = `Payer participant fspId ${participantId} is not active`;
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCRequiredRequesterParticipantIsNotActiveErrorPayload =
                {
                    requesterFspId: participantId,
                    quoteId,
                    bulkQuoteId,
                    errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE,
                };
            const errorEvent =
                new QuoteBCRequiredRequesterParticipantIsNotActiveErrorEvent(
                    errorPayload
                );
            timerEndFn({ success: "false" });
            return errorEvent;
        }
        timerEndFn({ success: "true" });
        return null;
    }
    //#endregion
}
