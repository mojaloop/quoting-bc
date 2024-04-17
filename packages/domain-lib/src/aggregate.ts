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
    QuoteQueryReceivedEvt,
    QuoteQueryResponseEvt,
    QuoteQueryResponseEvtPayload,
    QuoteRequestAcceptedEvt,
    QuoteRequestAcceptedEvtPayload,
    QuoteRequestReceivedEvt,
    QuoteResponseAccepted,
    QuoteResponseAcceptedEvtPayload,
    QuoteResponseReceivedEvt,
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
    IExtensionList,
    IGeoCode,
    IMoney,
    IQuote,
    QuoteState,
    QuotingErrorCodeNames 
} from "@mojaloop/quoting-bc-public-types-lib";
import { BulkQuote, Quote } from "./entities";
import { Currency } from "@mojaloop/platform-configuration-bc-public-types-lib";
import {ICounter, IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";
import { RequestReceivedQuoteCmd } from "./commands";

("use strict");

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

    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._quotesRepo = quoteRepo;
        this._bulkQuotesRepo = bulkQuoteRepo;
        this._messageProducer = messageProducer;
        this._participantService = participantService;
        this._accountLookupService = accountLookupService;
        this._passThroughMode = passThroughMode ?? false;
        this._currencyList = currencyList;

        this._histo = metrics.getHistogram("QuotingAggregate", "QuotingAggregate calls", ["callName", "success"]);
        this._commandsCounter = metrics.getCounter("QuotingAggregate_CommandsProcessed", "Commands processed by the Quoting Aggregate", ["commandName"]);
    }

    async init(): Promise<void> {
        // TODO
        //await this._messageProducer.connect();
    }

    async processCommandBatch(cmdMessages: CommandMsg[]): Promise<void> {
        // TODO make sure we're not processing another batch already
        // eslint-disable-next-line no-async-promise-executor
        return new Promise<void>(async (resolve) => {
            this._outputEvents = [];
            this._batchCommands.clear();

            try {
                // execute starts
                const execStarts_timerEndFn = this._histo.startTimer({ callName: "executeStarts"});
                for (const cmd of cmdMessages) {
                    if(cmd.msgType !== MessageTypes.COMMAND) continue;
                    await this._processCommand(cmd);
                    if(cmd.payload.bulkTransferId) {
                        // if(cmd.msgName === PrepareBulkTransferCmd.name) {
                        //     this._commandsCounter.inc({commandName: cmd.msgName}, cmd.payload.individualTransfers.length);
                        // } else if(cmd.msgName === CommitBulkTransferFulfilCmd.name) {
                        //     this._commandsCounter.inc({commandName: cmd.msgName}, cmd.payload.individualTransferResults.length);
                        // }
                    } else {
                        this._commandsCounter.inc({commandName: cmd.msgName}, 1);
                    }
        


                }
                execStarts_timerEndFn({success:"true"});

                // if(this._abBatchRequests.length<=0){
                //     // return Promise.resolve();
                //     resolve();
                //     return;
                // }

                // if(this._abBatchRequests.length !== cmdMessages.length)
                //     // eslint-disable-next-line no-debugger
                //     debugger;

                // send to A&B
                // const execAB_timerEndFn = this._histo.startTimer({ callName: "executeAandbProcessHighLevelBatch"});
                // if(this._logger.isDebugEnabled()) this._logger.debug("processCommandBatch() - before accountsAndBalancesAdapter.processHighLevelBatch()");
                // this._abBatchResponses = await this._accountAndBalancesAdapter.processHighLevelBatch(this._abBatchRequests);
                // if(this._logger.isDebugEnabled()) this._logger.debug("processCommandBatch() - after accountsAndBalancesAdapter.processHighLevelBatch()");
                // execAB_timerEndFn({success:"true"});

                // peek first and check count to establish no errors - or any other way to determine error

                // // execute continues
                // const executeContinues_timerEndFn = this._histo.startTimer({ callName: "executeContinues"});
                // for (const abResponse of this._abBatchResponses) {
                //     await this._processAccountsAndBalancesResponse(abResponse);
                // }
                // executeContinues_timerEndFn({success:"true"});

                // // if the continues queued cancellations, send then now
                // if(this._abCancelationBatchRequests.length){
                //     // send cancellations to A&B
                //     const execAB_timerEndFn = this._histo.startTimer({ callName: "executeAandbProcessHighLevelCancelationBatch"});
                //     if(this._logger.isDebugEnabled()) this._logger.debug("processCommandBatch() - before accountsAndBalancesAdapter.processHighLevelCancelationBatch()");
                //     this._abBatchResponses = await this._accountAndBalancesAdapter.processHighLevelBatch(this._abCancelationBatchRequests);
                //     if(this._logger.isDebugEnabled()) this._logger.debug("processCommandBatch() - after accountsAndBalancesAdapter.processHighLevelCancelationBatch()");
                //     execAB_timerEndFn({success:"true"});
                // }

            } catch (err: unknown) {
                const error = (err as Error).message;
                this._logger.error(err, error);
                throw error;
            } finally {
                // flush in mem repositories
                await this._flush();

                // send resulting/output events
                await this._messageProducer.send(this._outputEvents);

                // eslint-disable-next-line no-unsafe-finally
                // return Promise.resolve();
                resolve();
            }
        });
    }

    private async _flush():Promise<void>{
        const timerEndFn = this._histo.startTimer({callName: "flush"});

        if(this._quotesCache.size){
            const entries = Array.from(this._quotesCache.values());
            await this._quotesRepo.storeQuotes(entries);
            this._quotesCache.clear();
        }

        timerEndFn({success: "true"});
    }

    private async _processCommand(cmd: CommandMsg): Promise<void> {
        // cache command for later retrieval in continue methods - do this first!
        if(cmd.payload.bulkTransferId) {
            let quotes:any = [];

            // if(cmd.msgName === PrepareBulkTransferCmd.name) {
            //     quotes = cmd.payload.individualTransfers;
            // } else if(cmd.msgName === CommitBulkTransferFulfilCmd.name) {
            //     quotes = cmd.payload.individualTransferResults;
            // }
            for(let i=0 ; i<quotes.length ; i+=1) {
                const individualQuote = quotes[i];
                this._batchCommands.set(quotes[i].quoteId, { ...cmd, ...individualQuote });
            }
        } else {
            this._batchCommands.set(cmd.payload.quoteId, cmd);
        }

        // validate message
        this._ensureValidMessage(cmd);

        if (cmd.msgName === RequestReceivedQuoteCmd.name) {
            return this._handleQuoteRequestReceivedEvent(cmd as RequestReceivedQuoteCmd);

        } else {
            const requesterFspId = cmd.payload.requesterFspId;
            const quoteId = cmd.payload.quoteId;
			const errorMessage = `Command type is unknown: ${cmd.msgName}`;
            this._logger.error(errorMessage);
            const bulkQuoteId = cmd.payload?.bulkQuoteId ?? null;

            const errorCode = QuotingErrorCodeNames.COMMAND_TYPE_UNKNOWN;
            const errorEvent = new QuoteBCInvalidMessageTypeErrorEvent({
                bulkQuoteId,
                quoteId,
                errorCode: errorCode,
                requesterFspId,
            });
            errorEvent.fspiopOpaqueState = cmd.fspiopOpaqueState;
            this._outputEvents.push(errorEvent);
        }
    }

    private _ensureValidMessage(message: CommandMsg): void {
        if (!message.payload) {
            this._logger.error("QuotingCommandHandler: message payload has invalid format or value");
            throw new InvalidMessagePayloadError();
        }

        if (!message.msgName) {
            this._logger.error("QuotingCommandHandler: message name is invalid");
            throw new InvalidMessageTypeError();
        }

        if (message.msgType !== MessageTypes.COMMAND) {
            this._logger.error(`QuotingCommandHandler: message type is invalid : ${message.msgType}`);
            throw new InvalidMessageTypeError();
        }
    }

    //#region Quotes
    //#region handleQuoteRequestReceivedEvt
    private async _handleQuoteRequestReceivedEvent(
        message: QuoteRequestReceivedEvt
    ): Promise<void> {
        if(this._logger.isDebugEnabled()) this._logger.debug(`quoteRequestReceived() - Got quoteRequestReceivedEvt msg for quoteId: ${message.payload.quoteId}`);

        const quoteId = message.payload.quoteId;
        this._logger.isDebugEnabled() && this._logger.debug(
            `Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`
        );
        const requesterFspId =
            message.payload.payer?.partyIdInfo?.fspId ??
            message.fspiopOpaqueState.requesterFspId ??
            null;
        let destinationFspId =
            message.payload.payee?.partyIdInfo?.fspId ??
            message.fspiopOpaqueState.destinationFspId ??
            null;
        const expirationDate = message.payload.expiration ?? null;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            this._outputEvents.push(requesterParticipantError);
        }

        const isCurrencyValid = this.validateCurrency(message);
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
        }

        if (!destinationFspId) {
            const payeePartyId =
                message.payload.payee?.partyIdInfo?.partyIdentifier ?? null;
            const payeePartyType =
                message.payload.payee?.partyIdInfo?.partyIdType ?? null;
            const currency = message.payload.amount?.currency ?? null;
            this._logger.debug(
                `Get destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`
            );
            try {
                destinationFspId =
                    await this._accountLookupService.getAccountLookup(
                        payeePartyType,
                        payeePartyId,
                        currency
                    );
                this._logger.debug(
                    `Got destinationFspId: ${destinationFspId} from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`
                );
            } catch (error: unknown) {
                destinationFspId = null;
                this._logger.error(
                    `Error while getting destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`,
                    error
                );
            }
        }

        const destinationParticipantError =
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );
        if (destinationParticipantError) {
            this._outputEvents.push(destinationParticipantError);
        }

        if (expirationDate) {
            const expirationDateValidationError =
                this.validateQuoteExpirationDateOrGetErrorEvent(
                    quoteId,
                    expirationDate
                );
            if (expirationDateValidationError) {
                this._outputEvents.push(expirationDateValidationError);
            }
        }

        const now = Date.now();

        const quote: Quote = {
            createdAt: now,
            updatedAt: now,
            quoteId: message.payload.quoteId,
            bulkQuoteId: null,
            requesterFspId: message.fspiopOpaqueState.requesterFspId,
            destinationFspId: message.fspiopOpaqueState.destinationFspId,
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
            extensionList: message.payload.extensionList,
            payeeReceiveAmount: null,
            payeeFspFee: null,
            payeeFspCommission: null,
            status: QuoteState.PENDING,
            condition: null,
            totalTransferAmount: null,
            ilpPacket: null,
            errorInformation: null,
            transferAmount: message.payload.amount,
        };

        if (!this._passThroughMode) {
            try {
                await this._quotesRepo.addQuote(quote);
            } catch (error: unknown) {
                this._logger.error(
                    `Error adding quote with id ${quoteId}to database`,
                    error
                );
                const errorPayload: QuoteBCUnableToAddQuoteToDatabaseErrorPayload =
                    {
                        errorCode: QuotingErrorCodeNames.UNABLE_TO_ADD_QUOTE,
                        quoteId,
                    };
                const errorEvent =
                    new QuoteBCUnableToAddQuoteToDatabaseErrorEvent(
                        errorPayload
                    );
                this._outputEvents.push(errorEvent);
            }
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
            extensionList: message.payload.extensionList,
            converter: message.payload.converter,
            currencyConversion: message.payload.currencyConversion
        };

        const event = new QuoteRequestAcceptedEvt(payload);

        if(this._logger.isDebugEnabled()) this._logger.debug(`quoteRequestReceived() - completed for quoteId: ${quote.quoteId}`);

        this._outputEvents.push(event);
    }
    //#endregion

    //#region handleQuoteResponseReceivedEvt
    private async handleQuoteResponseReceivedEvent(
        message: QuoteResponseReceivedEvt
    ): Promise<DomainEventMsg> {
        const quoteId = message.payload.quoteId;
        this._logger.debug(
            `Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`
        );

        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState?.destinationFspId ?? null;
        const expirationDate = message.payload.expiration ?? null;
        let quoteErrorEvent: DomainEventMsg | null = null;
        let quoteStatus: QuoteState = QuoteState.ACCEPTED;

        const isCurrencyValid = this.validateCurrency(message);
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
        }

        if (quoteErrorEvent === null) {
            const requesterParticipantError =
                await this.validateRequesterParticipantInfoOrGetErrorEvent(
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
            }
        }

        if (quoteErrorEvent === null) {
            const destinationParticipantError =
                await this.validateDestinationParticipantInfoOrGetErrorEvent(
                    destinationFspId,
                    quoteId,
                    null
                );
            if (destinationParticipantError) {
                quoteErrorEvent = destinationParticipantError;
                quoteStatus = QuoteState.REJECTED;
            }
        }

        if (quoteErrorEvent === null) {
            const expirationDateError =
                this.validateQuoteExpirationDateOrGetErrorEvent(
                    quoteId,
                    expirationDate
                );
            if (expirationDateError) {
                quoteErrorEvent = expirationDateError;
                quoteStatus = QuoteState.EXPIRED;
            }
        }

        if (!this._passThroughMode) {
            const quote: Partial<Quote> = {
                quoteId: message.payload.quoteId,
                condition: message.payload.condition,
                expiration: message.payload.expiration,
                extensionList: message.payload.extensionList,
                geoCode: message.payload.geoCode,
                ilpPacket: message.payload.ilpPacket,
                payeeFspCommission: message.payload.payeeFspCommission,
                payeeFspFee: message.payload.payeeFspFee,
                payeeReceiveAmount: message.payload.payeeReceiveAmount,
                transferAmount: message.payload.transferAmount,
                status: quoteStatus,
            };

            try {
                await this._quotesRepo.updateQuote(quote as IQuote);
            } catch (err: unknown) {
                const error = (err as Error).message;
                this._logger.error(`Error updating quote: ${error}`);
                const errorPayload: QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload =
                    {
                        errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_QUOTE,
                        quoteId,
                    };
                const errorEvent =
                    new QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent(
                        errorPayload
                    );
                return errorEvent;
            }
        }

        // Return error event if previous validations failed
        if (quoteErrorEvent !== null) {
            return quoteErrorEvent;
        }

        const payload: QuoteResponseAcceptedEvtPayload = {
            quoteId: message.payload.quoteId,
            transferAmount: message.payload.transferAmount,
            expiration: message.payload.expiration,
            ilpPacket: message.payload.ilpPacket,
            condition: message.payload.condition,
            payeeReceiveAmount: message.payload.payeeReceiveAmount,
            payeeFspFee: message.payload.payeeFspFee,
            payeeFspCommission: message.payload.payeeFspCommission,
            geoCode: message.payload.geoCode,
            extensionList: message.payload.extensionList,
        };
        //TODO: add evt to name
        const event = new QuoteResponseAccepted(payload);

        return event;
    }
    //#endregion

    //#region handleQuoteQueryReceivedEvt
    private async handleQuoteQueryReceivedEvent(
        message: QuoteQueryReceivedEvt
    ): Promise<DomainEventMsg> {
        const quoteId = message.payload.quoteId;
        this._logger.debug(
            `Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`
        );

        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState?.destinationFspId ?? null;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            return requesterParticipantError;
        }

        const destinationParticipantError =
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );
        if (destinationParticipantError) {
            return destinationParticipantError;
        }

        const quote = await this._quotesRepo
            .getQuoteById(quoteId)
            .catch((error) => {
                this._logger.error("Error getting quote: {quoteId}", error);
                return null;
            });

        if (!quote) {
            const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
                quoteId,
                errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCQuoteNotFoundErrorEvent(errorPayload);
            return errorEvent;
        }

        const payload: QuoteQueryResponseEvtPayload = {
            quoteId: quote.quoteId,
            transferAmount: quote.transferAmount as IMoney,
            expiration: quote.expiration as string,
            ilpPacket: quote.ilpPacket as string,
            condition: quote.condition as string,
            payeeReceiveAmount: quote.amount,
            payeeFspFee: quote.payeeFspFee,
            extensionList: quote.extensionList as IExtensionList,
            geoCode: quote.geoCode as IGeoCode,
            payeeFspCommission: quote.payeeFspCommission as IMoney,
        };

        const event = new QuoteQueryResponseEvt(payload);

        return event;
    }
    //#endregion

    //#region handleGetQuoteQueryRejectedEvt
    private async handleQuoteRejectedEvent(
        message: QuoteRejectedEvt
    ): Promise<DomainEventMsg> {
        this._logger.debug(
            `Got QuoteRejected msg for quoteId: ${message.payload.quoteId}`
        );

        const quoteId = message.payload.quoteId;
        const requesterFspId = message.fspiopOpaqueState.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState.destinationFspId ?? null;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                quoteId,
                null
            );
        if (requesterParticipantError) {
            this._logger.error(
                `Invalid participant info for requesterFspId: ${requesterFspId}`
            );
            return requesterParticipantError;
        }

        const destinationParticipantError =
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                quoteId,
                null
            );
        if (destinationParticipantError) {
            this._logger.error(
                `Invalid participant info for destinationFspId: ${destinationFspId}`
            );
            return destinationParticipantError;
        }

        const payload: QuoteRejectedResponseEvtPayload = {
            quoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new QuoteRejectedResponseEvt(payload);

        return event;
    }
    //#endregion
    //#endregion

    //#region BulkQuotes
    //#region handleBulkQuoteRequestedEvt
    private async handleBulkQuoteRequestedEvent(
        message: BulkQuoteRequestedEvt
    ): Promise<DomainEventMsg> {
        const bulkQuoteId = message.payload.bulkQuoteId;
        this._logger.debug(
            `Got handleBulkQuoteRequestedEvt msg for quoteId: ${message.payload.bulkQuoteId}`
        );
        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
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
            return errorEvent;
        }

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            return requesterParticipantError;
        }

        let destinationFspId = message.fspiopOpaqueState.destinationFspId;

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
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            return destinationParticipantError;
        }

        if (expirationDate) {
            const expirationDateError =
                this.validateBulkQuoteExpirationDateOrGetErrorEvent(
                    bulkQuoteId,
                    expirationDate
                );
            if (expirationDateError) {
                return expirationDateError;
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
            extensionList: message.payload.extensionList,
            quotesNotProcessedIds: [],
            status: QuoteState.PENDING,
        };

        if (!this._passThroughMode) {
            try {
                await this.addBulkQuote(bulkQuote);
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
                return errorEvent;
            }
        }

        const payload: BulkQuoteReceivedEvtPayload = {
            bulkQuoteId,
            payer: message.payload.payer,
            geoCode: message.payload.geoCode,
            expiration: expirationDate,
            //TODO: fix this to be of type IQuote[]
            individualQuotes: individualQuotesInsideBulkQuote,
            extensionList: message.payload.extensionList,
        };

        const event = new BulkQuoteReceivedEvt(payload);

        return event;
    }

    //#endregion

    //#region handleBulkQuotePendingReceivedEvt
    private async handleBulkQuotePendingReceivedEvent(
        message: BulkQuotePendingReceivedEvt
    ): Promise<DomainEventMsg> {
        const bulkQuoteId = message.payload.bulkQuoteId;
        this._logger.debug(
            `Got BulkQuotePendingReceivedEvt msg for bulkQuoteId:${bulkQuoteId} and bulkQuotes: ${message.payload.individualQuoteResults}`
        );
        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState?.destinationFspId ?? null;
        const expirationDate = message.payload.expiration ?? null;

        let bulkQuoteErrorEvent: DomainEventMsg | null = null;
        let quoteStatus: QuoteState = QuoteState.ACCEPTED;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
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
                await this.validateDestinationParticipantInfoOrGetErrorEvent(
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
                this.validateBulkQuoteExpirationDateOrGetErrorEvent(
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
                await this.updateBulkQuote(
                    bulkQuoteId,
                    requesterFspId,
                    destinationFspId,
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
                return errorEvent;
            }
        }

        //If there was any error during prior validation, return the error event
        if (bulkQuoteErrorEvent) {
            return bulkQuoteErrorEvent;
        }

        const payload: BulkQuoteAcceptedEvtPayload = {
            bulkQuoteId: message.payload.bulkQuoteId,
            individualQuoteResults: message.payload.individualQuoteResults,
            expiration: message.payload.expiration,
            extensionList: message.payload.extensionList,
        };

        const event = new BulkQuoteAcceptedEvt(payload);

        return event;
    }
    //#endregion

    //#region handleGetBulkQuoteQueryReceived
    private async handleGetBulkQuoteQueryReceivedEvent(
        message: BulkQuoteQueryReceivedEvt
    ): Promise<DomainEventMsg> {
        const bulkQuoteId = message.payload.bulkQuoteId;
        this._logger.debug(
            `Got GetBulkQuoteQueryReceived msg for bulkQuoteId: ${bulkQuoteId}`
        );

        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState?.destinationFspId ?? null;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            return requesterParticipantError;
        }

        const destinationParticipantError =
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            return destinationParticipantError;
        }

        let bulkQuote = null;

        if (!this._passThroughMode) {
            bulkQuote = await this._bulkQuotesRepo
                .getBulkQuoteById(bulkQuoteId)
                .catch((error) => {
                    this._logger.error(
                        `Error getting bulk quote for bulkQuoteId: ${bulkQuoteId}`,
                        error
                    );
                });
        }

        if (!bulkQuote) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
            };
            const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(
                errorPayload
            );
            return errorEvent;
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
            return errorEvent;
        }

        const payload: BulkQuoteQueryResponseEvtPayload = {
            bulkQuoteId: bulkQuote.bulkQuoteId,
            individualQuoteResults: individualQuotes,
            expiration: bulkQuote.expiration,
            extensionList: bulkQuote.extensionList,
        };

        const event = new BulkQuoteQueryResponseEvt(payload);

        return event;
    }

    //#endregion

    //#region handleGetBulkQuoteQueryRejected

    private async handleGetBulkQuoteQueryRejectedEvent(
        message: BulkQuoteRejectedEvt
    ): Promise<DomainEventMsg> {
        this._logger.debug(
            `Got GetBulkQuoteQueryRejected msg for quoteId: ${message.payload.bulkQuoteId}`
        );

        const bulkQuoteId = message.payload.bulkQuoteId;
        const requesterFspId = message.fspiopOpaqueState.requesterFspId ?? null;
        const destinationFspId =
            message.fspiopOpaqueState.destinationFspId ?? null;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            this._logger.error(
                `Invalid participant info for requesterFspId: ${requesterFspId}`
            );
            return requesterParticipantError;
        }

        const destinationParticipantError =
            await this.validateDestinationParticipantInfoOrGetErrorEvent(
                destinationFspId,
                null,
                bulkQuoteId
            );
        if (destinationParticipantError) {
            this._logger.error(
                `Invalid participant info for destinationFspId: ${destinationFspId}`
            );
            return destinationParticipantError;
        }

        const payload: BulkQuoteRejectedResponseEvtPayload = {
            bulkQuoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new BulkQuoteRejectedResponseEvt(payload);

        return event;
    }
    //#endregion
    //#endregion

    //#region Quotes database operations

    private async addBulkQuote(bulkQuote: IBulkQuote): Promise<void> {
        //Add bulkQuote to database and iterate through quotes to add them to database
        try {
            await this._bulkQuotesRepo.addBulkQuote(bulkQuote);
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
        });

        try {
            await this._quotesRepo.addQuotes(quotes);
        } catch (err) {
            const errorMessage = `Error adding quotes for bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
            this._logger.error(errorMessage, err);
            throw new UnableToAddBatchQuoteError(errorMessage);
        }
    }

    private async updateBulkQuote(
        bulkQuoteId: string,
        requesterFspId: string,
        destinationFspId: string,
        status: QuoteState,
        quotesReceived: IQuote[]
    ): Promise<void> {
        const bulkQuote = await this._bulkQuotesRepo
            .getBulkQuoteById(bulkQuoteId)
            .catch((error) => {
                this._logger.error(
                    `Error getting bulk quote:${bulkQuoteId}`,
                    error
                );
                return null;
            });

        if (!bulkQuote) {
            const errorMessage = `Bulk Quote not found for bulkQuoteId: ${bulkQuoteId}`;
            this._logger.error(errorMessage);
            throw new BulkQuoteNotFoundError(errorMessage);
        }

        const quotesThatBelongToBulkQuote =
            (await this._quotesRepo
                .getQuotesByBulkQuoteId(bulkQuoteId)
                .catch((error) => {
                    this._logger.error(
                        `Error getting quotes for bulk quote:${bulkQuoteId}`,
                        error
                    );
                    throw new UnableToGetBatchQuotesError(
                        "Unable to get quotes for bulk quote"
                    );
                })) ?? [];

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
                quote.ilpPacket = quoteFromBulkQuoteReceivedInRequest.ilpPacket;
                quote.condition = quoteFromBulkQuoteReceivedInRequest.condition;
                quote.payeeReceiveAmount =
                    quoteFromBulkQuoteReceivedInRequest.payeeReceiveAmount;
                quote.payeeFspFee =
                    quoteFromBulkQuoteReceivedInRequest.payeeFspFee;
                quote.payeeFspCommission =
                    quoteFromBulkQuoteReceivedInRequest.payeeFspCommission;
                quote.extensionList =
                    quoteFromBulkQuoteReceivedInRequest.extensionList;
                quote.errorInformation =
                    quoteFromBulkQuoteReceivedInRequest.errorInformation;
            }
        });

        bulkQuote.updatedAt = now;
        bulkQuote.status = status;

        try {
            if (quotesThatBelongToBulkQuote.length > 0) {
                await this._quotesRepo.updateQuotes(
                    quotesThatBelongToBulkQuote
                );
            }
        } catch (err) {
            const errorMessage = `Error updating quotes for bulkQuoteId: ${bulkQuoteId}.`;
            this._logger.error(errorMessage, err);
            throw new UnableToUpdateBatchQuotesError(errorMessage);
        }

        try {
            await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
        } catch (err) {
            const errorMessage = `Error updating bulk quote for bulkQuoteId: ${bulkQuoteId}.`;
            this._logger.error(errorMessage, err);
            throw new UnableToUpdateBulkQuoteError(errorMessage);
        }
    }

    //#endregion

    //#region Validations

    private validateCurrency(message: IMessage): boolean {
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

    private validateBulkQuoteExpirationDateOrGetErrorEvent(
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

    private validateQuoteExpirationDateOrGetErrorEvent(
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

    private validateMessageOrGetErrorEvent(
        message: IMessage
    ): DomainEventMsg | null {
        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const quoteId = message.payload?.quoteId ?? null;
        const bulkQuoteId = message.payload?.bulkQuoteId ?? null;

        if (!message.payload) {
            const errorMessage = "Message payload is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidMessagePayloadErrorPayload = {
                quoteId,
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_PAYLOAD,
                requesterFspId,
            };

            const errorEvent = new QuoteBCInvalidMessagePayloadErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        if (!message.msgName) {
            const errorMessage = "Message name is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidMessageTypeErrorPayload = {
                bulkQuoteId,
                quoteId,
                errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_TYPE,
                requesterFspId,
            };
            const errorEvent = new QuoteBCInvalidMessageTypeErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        return null;
    }

    private async validateDestinationParticipantInfoOrGetErrorEvent(
        participantId: string,
        quoteId: string | null,
        bulkQuoteId: string | null
    ): Promise<DomainEventMsg | null> {
        let participant: IParticipant | null = null;

        if (!participantId) {
            const errorMessage = "Payee fspId is null or undefined";
            this._logger.error(errorMessage);
            const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
                bulkQuoteId,
                errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
                destinationFspId: participantId,
                quoteId,
            };
            const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        participant = await this._participantService
            .getParticipantInfo(participantId)
            .catch((err: unknown) => {
                const error = (err as Error).message;
                this._logger.error(
                    `Error getting payee info for id: ${participantId}`,
                    error
                );
                return null;
            });

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
            return errorEvent;
        }
        return null;
    }

    private async validateRequesterParticipantInfoOrGetErrorEvent(
        participantId: string,
        quoteId: string | null,
        bulkQuoteId: string | null
    ): Promise<DomainEventMsg | null> {
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

        participant = await this._participantService
            .getParticipantInfo(participantId)
            .catch((error: Error) => {
                this._logger.error(
                    `Error getting payer info for fspId: ${participantId}`,
                    error
                );
                return null;
            });

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
            return errorEvent;
        }
        return null;
    }
    //#endregion
}
