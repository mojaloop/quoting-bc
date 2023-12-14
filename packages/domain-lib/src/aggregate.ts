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
    GetBulkQuoteQueryRejectedEvt,
    GetBulkQuoteQueryRejectedResponseEvt,
    GetBulkQuoteQueryRejectedResponseEvtPayload,
    GetQuoteQueryRejectedEvt,
    GetQuoteQueryRejectedResponseEvt,
    GetQuoteQueryRejectedResponseEvtPayload,
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
    UnableToAddBatchQuoteError,
    UnableToAddBulkQuoteError,
    UnableToGetBatchQuotesError,
    UnableToUpdateBatchQuotesError,
    UnableToUpdateBulkQuoteError,
} from "./errors";
import {
    DomainEventMsg,
    IMessage,
    IMessageProducer,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    IAccountLookupService,
    IBulkQuoteRepo,
    IParticipantService,
    IQuoteRepo,
} from "./interfaces/infrastructure";
import {
    IBulkQuote,
    IExtensionList,
    IGeoCode,
    IMoney,
    IQuote,
    IQuoteSchemeRules,
    QuoteStatus,
} from "./types";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

("use strict");

export class QuotingAggregate {
    private readonly _logger: ILogger;
    private readonly _quotesRepo: IQuoteRepo;
    private readonly _bulkQuotesRepo: IBulkQuoteRepo;
    private readonly _messageProducer: IMessageProducer;
    private readonly _participantService: IParticipantService;
    private readonly _accountLookupService: IAccountLookupService;
    private readonly _passThroughMode: boolean;
    private readonly _schemeRules: IQuoteSchemeRules;

    constructor(
        logger: ILogger,
        quoteRepo: IQuoteRepo,
        bulkQuoteRepo: IBulkQuoteRepo,
        messageProducer: IMessageProducer,
        participantService: IParticipantService,
        accountLookupService: IAccountLookupService,
        passThroughMode: boolean,
        schemeRules: IQuoteSchemeRules
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._quotesRepo = quoteRepo;
        this._bulkQuotesRepo = bulkQuoteRepo;
        this._messageProducer = messageProducer;
        this._participantService = participantService;
        this._accountLookupService = accountLookupService;
        this._passThroughMode = passThroughMode ?? false;
        this._schemeRules = schemeRules;
    }

    //#region Event Handlers
    async handleQuotingEvent(message: IMessage): Promise<void> {
        this._logger.debug(`Got message in Quoting handler - msg: ${message}`);
        const requesterFspId =
            message.fspiopOpaqueState?.requesterFspId ?? null;
        const quoteId = message.payload?.quoteId ?? null;
        const bulkQuoteId = message.payload?.bulkQuoteId ?? null;

        const eventMessageError = this.validateMessageOrGetErrorEvent(message);
        let eventToPublish = null;

        if (eventMessageError) {
            eventMessageError.fspiopOpaqueState = message.fspiopOpaqueState;
            await this._messageProducer.send(eventMessageError);
            return;
        }

        try {
            switch (message.msgName) {
                case QuoteRequestReceivedEvt.name:
                    eventToPublish = await this.handleQuoteRequestReceivedEvent(
                        message as QuoteRequestReceivedEvt
                    );
                    break;
                case QuoteResponseReceivedEvt.name:
                    eventToPublish =
                        await this.handleQuoteResponseReceivedEvent(
                            message as QuoteResponseReceivedEvt
                        );
                    break;
                case QuoteQueryReceivedEvt.name:
                    eventToPublish = await this.handleQuoteQueryReceivedEvent(
                        message as QuoteQueryReceivedEvt
                    );
                    break;
                case GetQuoteQueryRejectedEvt.name:
                    eventToPublish =
                        await this.handleGetQuoteQueryRejectedEvent(
                            message as GetQuoteQueryRejectedEvt
                        );
                    break;
                case BulkQuoteRequestedEvt.name:
                    eventToPublish = await this.handleBulkQuoteRequestedEvent(
                        message as BulkQuoteRequestedEvt
                    );
                    break;
                case BulkQuotePendingReceivedEvt.name:
                    eventToPublish =
                        await this.handleBulkQuotePendingReceivedEvent(
                            message as BulkQuotePendingReceivedEvt
                        );
                    break;
                case BulkQuoteQueryReceivedEvt.name:
                    eventToPublish =
                        await this.handleGetBulkQuoteQueryReceivedEvent(
                            message as BulkQuoteQueryReceivedEvt
                        );
                    break;
                case GetBulkQuoteQueryRejectedEvt.name:
                    eventToPublish =
                        await this.handleGetBulkQuoteQueryRejectedEvent(
                            message as GetBulkQuoteQueryRejectedEvt
                        );
                    break;
                default: {
                    const errorMessage = `Message type has invalid format or value ${message.msgName}`;
                    this._logger.error(errorMessage);
                    const errorPayload: QuoteBCUnknownErrorPayload = {
                        quoteId,
                        bulkQuoteId,
                        errorDescription: errorMessage,
                        requesterFspId,
                    };
                    eventToPublish = new QuoteBCUnknownErrorEvent(errorPayload);
                }
            }
        } catch (error: unknown) {
            const errorMessage = `Error while handling message ${message.msgName}`;
            this._logger.error(errorMessage + `- ${error}`);
            const errorPayload: QuoteBCUnknownErrorPayload = {
                quoteId,
                bulkQuoteId,
                errorDescription: errorMessage,
                requesterFspId,
            };
            eventToPublish = new QuoteBCUnknownErrorEvent(errorPayload);
        }

        eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
        await this._messageProducer.send(eventToPublish);
    }

    //#endregion

    //#region Quotes
    //#region handleQuoteRequestReceivedEvt
    private async handleQuoteRequestReceivedEvent(
        message: QuoteRequestReceivedEvt
    ): Promise<DomainEventMsg> {
        const quoteId = message.payload.quoteId;
        this._logger.debug(
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
            return requesterParticipantError;
        }

        const isSchemaValid = this.validateScheme(message);
        if (!isSchemaValid) {
            const errorPayload: QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload =
                {
                    quoteId,
                    errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`,
                };
            const errorEvent =
                new QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent(
                    errorPayload
                );
            return errorEvent;
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
            return destinationParticipantError;
        }

        if (expirationDate) {
            const expirationDateValidationError =
                this.validateQuoteExpirationDateOrGetErrorEvent(
                    quoteId,
                    expirationDate
                );
            if (expirationDateValidationError) {
                return expirationDateValidationError;
            }
        }

        const now = Date.now();

        const quote: IQuote = {
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
            status: QuoteStatus.PENDING,
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
                        errorDescription:
                            "Unable to add quote with to database",
                        quoteId,
                    };
                const errorEvent =
                    new QuoteBCUnableToAddQuoteToDatabaseErrorEvent(
                        errorPayload
                    );
                return errorEvent;
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
        };

        const event = new QuoteRequestAcceptedEvt(payload);

        return event;
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
        let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

        const isSchemaValid = this.validateScheme(message);
        if (!isSchemaValid) {
            const errorPayload: QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload =
                {
                    errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`,
                    quoteId,
                };
            quoteErrorEvent =
                new QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent(
                    errorPayload
                );
            this._logger.error(
                `Quote ${quoteId} rejected due to scheme validation error`
            );
            quoteStatus = QuoteStatus.REJECTED;
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
                quoteStatus = QuoteStatus.REJECTED;
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
                quoteStatus = QuoteStatus.REJECTED;
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
                quoteStatus = QuoteStatus.EXPIRED;
            }
        }

        if (!this._passThroughMode) {
            const quote: Partial<IQuote> = {
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
                        errorDescription: "Unable to update quote in database",
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
                this._logger.error(`Error getting quote: {quoteId}`, error);
                return null;
            });

        if (!quote) {
            const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
                quoteId,
                errorDescription: `Quote with id ${quoteId} not found`,
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
    private async handleGetQuoteQueryRejectedEvent(
        message: GetQuoteQueryRejectedEvt
    ): Promise<DomainEventMsg> {
        this._logger.debug(
            `Got getQuoteQueryRejected msg for quoteId: ${message.payload.quoteId}`
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

        const payload: GetQuoteQueryRejectedResponseEvtPayload = {
            quoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new GetQuoteQueryRejectedResponseEvt(payload);

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
                errorDescription: `BulkQuote ${bulkQuoteId} has no individual quotes`,
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

        const bulkQuote: IBulkQuote = {
            createdAt: now,
            updatedAt: now,
            bulkQuoteId: bulkQuoteId,
            payer: message.payload.payer,
            geoCode: message.payload.geoCode,
            expiration: message.payload.expiration,
            individualQuotes: individualQuotesInsideBulkQuote as IQuote[],
            extensionList: message.payload.extensionList,
            quotesNotProcessedIds: [],
            status: QuoteStatus.PENDING
        };

        if (!this._passThroughMode) {
            try {
                await this.addBulkQuote(bulkQuote);
            } catch (error: unknown) {
                const errorMessage = `Error adding bulk quote ${bulkQuoteId} to database`;
                this._logger.error(errorMessage, error);
                const errorPayload: QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload =
                    {
                        errorDescription: errorMessage,
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
        let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

        const requesterParticipantError =
            await this.validateRequesterParticipantInfoOrGetErrorEvent(
                requesterFspId,
                null,
                bulkQuoteId
            );
        if (requesterParticipantError) {
            bulkQuoteErrorEvent = requesterParticipantError;
            quoteStatus = QuoteStatus.REJECTED;
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
                quoteStatus = QuoteStatus.REJECTED;
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
                quoteStatus = QuoteStatus.EXPIRED;
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
                        errorDescription: errorMessage,
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

        const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
        const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

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

        const bulkQuote = await this._bulkQuotesRepo
            .getBulkQuoteById(bulkQuoteId)
            .catch((error) => {
                this._logger.error(
                    `Error getting bulk quote: ${error.message}`
                );
                return null;
            });

        if (!bulkQuote) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId,
                errorDescription: `Bulk Quote ${bulkQuoteId} not found`,
            };
            const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(
                errorPayload
            );
            return errorEvent;
        }

        const individualQuotes = await this._quotesRepo
            .getQuotesByBulkQuoteId(bulkQuoteId)
            .catch((error) => {
                this._logger.error(
                    "Error getting quotes for bulk quote",
                    error
                );
                return null;
            });

        //#TODO : change to individual quote error
        if (!individualQuotes) {
            const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
                bulkQuoteId,
                errorDescription: `Bulk Quote ${bulkQuoteId} not found`,
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
        message: GetBulkQuoteQueryRejectedEvt
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

        const payload: GetBulkQuoteQueryRejectedResponseEvtPayload = {
            bulkQuoteId,
            errorInformation: message.payload.errorInformation,
        };

        const event = new GetBulkQuoteQueryRejectedResponseEvt(payload);

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
            quote.status = QuoteStatus.PENDING;
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
        status: QuoteStatus,
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

    private validateScheme(message: IMessage): boolean {
        const currency =
            message.payload.transferAmount?.currency ??
            message.payload.amount?.currency;
        if (!currency) {
            this._logger.error("Currency is not sent in the request");
            return false;
        }

        const currenciesSupported = this._schemeRules.currencies.map(
            (currency) => currency.toLocaleLowerCase()
        );

        if (!currenciesSupported.includes(currency.toLocaleLowerCase())) {
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
                errorDescription: `Error parsing date for bulkQuoteId: ${bulkQuoteId}`,
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
                errorDescription: errorMessage,
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
                errorDescription: `Error parsing date for quoteId: ${quoteId}`,
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
                errorDescription: errorMessage,
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
                errorDescription: errorMessage,
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
                errorDescription: errorMessage,
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
                errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
                    errorDescription: errorMessage,
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
