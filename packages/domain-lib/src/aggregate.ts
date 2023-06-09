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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { IParticipant } from '@mojaloop/participant-bc-public-types-lib';
import { DomainEventMsg, IDomainMessage, IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAccountLookupService, IBulkQuoteRepo, IParticipantService, IQuoteRepo} from "./interfaces/infrastructure";
import {
	QuoteRequestReceivedEvt,
	QuoteRequestAcceptedEvt,
	QuoteRequestAcceptedEvtPayload,
	QuoteResponseReceivedEvt,
	QuoteResponseAccepted,
	QuoteResponseAcceptedEvtPayload,
	QuoteQueryReceivedEvt,
	QuoteQueryResponseEvt,
	QuoteQueryResponseEvtPayload,
	BulkQuoteRequestedEvt,
	BulkQuoteReceivedEvt,
	BulkQuoteReceivedEvtPayload,
	BulkQuotePendingReceivedEvt,
	BulkQuoteAcceptedEvt,
	BulkQuoteAcceptedEvtPayload,
	QuoteBCQuoteExpiredErrorPayload,
	QuoteBCQuoteExpiredErrorEvent,
	QuoteBCBulkQuoteExpiredErrorPayload,
	QuoteBCInvalidMessageTypeErrorEvent,
	QuoteBCInvalidMessageTypeErrorPayload,
	QuoteBCInvalidMessagePayloadErrorPayload,
	QuoteBCInvalidMessagePayloadErrorEvent,
	QuoteBCInvalidDestinationFspIdErrorPayload,
	QuoteBCInvalidDestinationFspIdErrorEvent,
	QuoteBCInvalidRequesterFspIdErrorPayload,
	QuoteBCInvalidRequesterFspIdErrorEvent,
	QuoteBCUnknownErrorPayload,
	QuoteBCUnknownErrorEvent,
	QuoteBCUnableToAddQuoteToDatabaseErrorPayload,
	QuoteBCUnableToAddQuoteToDatabaseErrorEvent,
	QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload,
	QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent,
	QuoteBCInvalidBulkQuoteLengthErrorPayload,
	QuoteBCInvalidBulkQuoteLengthErrorEvent,
	QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent,
	QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload,
	QuoteBCQuoteNotFoundErrorPayload,
	QuoteBCQuoteNotFoundErrorEvent,
	QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload,
	QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent,
	QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload,
	QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent,
	QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload,
	QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent,
	QuoteBCBulkQuoteExpiredErrorEvent,
	QuoteBCParticipantNotFoundErrorEvent,
	QuoteBCParticipantNotFoundErrorPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IExtensionList, IGeoCode, IMoney, IQuote, IQuoteSchemeRules, QuoteStatus } from "./types";

export class QuotingAggregate  {
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
		quoteRepo:IQuoteRepo,
		bulkQuoteRepo:IBulkQuoteRepo,
		messageProducer:IMessageProducer,
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
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const quoteId = message.payload?.quoteId;
		const bulkQuoteId = message.payload?.bulkQuoteId;

		const eventMessageError = this.validateMessageOrGetErrorEvent(message);
		let eventToPublish = null;

		if(eventMessageError){
			eventMessageError.fspiopOpaqueState = message.fspiopOpaqueState;
			await this._messageProducer.send(eventMessageError);
			return;
		}

		try{
			switch(message.msgName){
				case QuoteRequestReceivedEvt.name:
					eventToPublish = await this.handleQuoteRequestReceivedEvent(message as QuoteRequestReceivedEvt);
					break;
				case QuoteResponseReceivedEvt.name:
					eventToPublish = await this.handleQuoteResponseReceivedEvent(message as QuoteResponseReceivedEvt);
					break;
				case QuoteQueryReceivedEvt.name:
					eventToPublish = await this.handleQuoteQueryReceivedEvent(message as QuoteQueryReceivedEvt);
					break;
				case BulkQuoteRequestedEvt.name:
					eventToPublish = await this.handleBulkQuoteRequestedEvent(message as BulkQuoteRequestedEvt);
					break;
				case BulkQuotePendingReceivedEvt.name:
					eventToPublish = await this.handleBulkQuotePendingReceivedEvent(message as BulkQuotePendingReceivedEvt);
					break;
				default:{
						const errorMessage = `Message type has invalid format or value ${message.msgName}`;
						this._logger.error(errorMessage);
						const errorPayload: QuoteBCUnknownErrorPayload = {
							quoteId,
							bulkQuoteId,
							errorDescription: errorMessage,
							fspId: requesterFspId
						};
						eventToPublish = new QuoteBCUnknownErrorEvent(errorPayload);
					}
				}
		}
		catch(error:unknown) {
			const errorMessage = `Error while handling message ${message.msgName}`;
			this._logger.error(errorMessage + `- ${error}`);
			const errorPayload: QuoteBCUnknownErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: requesterFspId
			};
			eventToPublish = new QuoteBCUnknownErrorEvent(errorPayload);
		}

		eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
		await this._messageProducer.send(eventToPublish);
	}
	//#endregion

	//#region handleQuoteRequestReceivedEvt
	private async handleQuoteRequestReceivedEvent(message: QuoteRequestReceivedEvt):Promise<DomainEventMsg> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);
		const requesterFspId = message.fspiopOpaqueState.requesterFspId ?? null;
		let destinationFspId = message.fspiopOpaqueState?.destinationFspId ?? message.payload?.payee?.partyIdInfo?.fspId;
		const expirationDate = message.payload.expiration ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
		if(requesterParticipantError){
			return requesterParticipantError;
		}

		const isSchemaValid = this.validateScheme(message);
		if(!isSchemaValid){
			const errorPayload: QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload = {
				quoteId,
				errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`,
				fspId: requesterFspId
			};
			const errorEvent = new QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent(errorPayload);
			return errorEvent;
		}

		if(!destinationFspId){
			const payeePartyId = message.payload.payee?.partyIdInfo?.partyIdentifier;
			const payeePartyIdType = message.payload.payee?.partyIdInfo?.partyIdType;
			const currency = message.payload.amount?.currency ?? null;
			this._logger.debug(`Get destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyIdType}, currency: ${currency}`);
			destinationFspId = await this._accountLookupService.getAccountLookup(payeePartyId, payeePartyIdType, currency);
			this._logger.debug(`Got destinationFspId: ${destinationFspId ?? null} from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyIdType}, currency: ${currency}`);
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null);
		if(destinationParticipantError){
			return destinationParticipantError;
		}

		if(expirationDate){
			const expirationDateValidationError = this.validateExpirationDateOrGetErrorEvent(requesterFspId, quoteId,null, expirationDate);
			if(expirationDateValidationError){
				return expirationDateValidationError;
			}
		}

		const quote: IQuote = {
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
			transferAmount: message.payload.amount
		};

		if(!this._passThroughMode)
		{
			const quoteAddedToDatabase = this._quotesRepo.addQuote(quote).catch((error) => {
				this._logger.error(`Error adding quote to database: ${error}`);
				return false;
			});

			if(!quoteAddedToDatabase){
				const errorPayload : QuoteBCUnableToAddQuoteToDatabaseErrorPayload = {
					errorDescription: "Unable to add quote to database",
					fspId: requesterFspId,
					quoteId
				};
				const errorEvent = new QuoteBCUnableToAddQuoteToDatabaseErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		const payee = message.payload.payee;
		if(!payee.partyIdInfo.fspId){
			payee.partyIdInfo.fspId = destinationFspId;
		}

		const payload : QuoteRequestAcceptedEvtPayload = {
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
			extensionList: message.payload.extensionList
		};

		const event = new QuoteRequestAcceptedEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}
	//#endregion

	//#region handleQuoteResponseReceivedEvt
	private async handleQuoteResponseReceivedEvent(message: QuoteResponseReceivedEvt):Promise<DomainEventMsg> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		const expirationDate = message.payload.expiration ?? null;
		let quoteErrorEvent: DomainEventMsg|null = null;
		let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

		const isSchemaValid = this.validateScheme(message);
		if(!isSchemaValid){
			const errorPayload : QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload = {
				errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`,
				fspId: requesterFspId,
				quoteId
			};
			quoteErrorEvent = new QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent(errorPayload);
		}

		if(quoteErrorEvent === null){
		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId,quoteId,null);
			if(requesterParticipantError){
				quoteErrorEvent = requesterParticipantError;
				quoteStatus = QuoteStatus.REJECTED;
			}
		}

		if(quoteErrorEvent === null){
			const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null);
			if(destinationParticipantError){
				quoteErrorEvent = destinationParticipantError;
				quoteStatus = QuoteStatus.REJECTED;
			}
		}

		if(quoteErrorEvent !== null){
			const expirationDateError = this.validateExpirationDateOrGetErrorEvent(requesterFspId, quoteId,null, expirationDate);
			if(expirationDateError){
				quoteErrorEvent = expirationDateError;
				quoteStatus = QuoteStatus.EXPIRED;
			}
		}

		if(!this._passThroughMode)
		{
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
				status: quoteStatus
			};

			const updatedQuote = await this._quotesRepo.updateQuote(quote as IQuote).catch((error) => {
				this._logger.error(`Error updating quote: ${error.message}`);
				return false;
			});

			if(!updatedQuote){
				const errorPayload : QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload = {
					errorDescription: "Unable to update quote in database",
					fspId: requesterFspId,
					quoteId
				};
				const errorEvent = new QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		// Return error event if previous validations failed
		if(quoteErrorEvent !== null){
			return quoteErrorEvent;
		}

		const payload : QuoteResponseAcceptedEvtPayload = {
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

		const event = new QuoteResponseAccepted(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}
	//#endregion

	//#region handleQuoteQueryReceivedEvt
	private async handleQuoteQueryReceivedEvent(message: QuoteQueryReceivedEvt):Promise<DomainEventMsg> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
		if(requesterParticipantError){
			return requesterParticipantError;
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null);
		if(destinationParticipantError){
			return destinationParticipantError;
		}

		const quote = await this._quotesRepo.getQuoteById(quoteId).catch((error) => {
			this._logger.error(`Error getting quote: ${error.message}`);
			return null;
		});

		if(!quote) {
			const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
				quoteId,
				errorDescription: `Quote ${quoteId} not found` ,
				fspId: requesterFspId
			};
			const errorEvent = new QuoteBCQuoteNotFoundErrorEvent(errorPayload);
			return errorEvent;
		}

		const payload: QuoteQueryResponseEvtPayload = {
			quoteId: quote.quoteId,
			transferAmount: quote.totalTransferAmount as IMoney,
			expiration: quote.expiration as string,
			ilpPacket: quote.ilpPacket as string,
			condition:	quote.condition as string,
			payeeReceiveAmount: quote.amount,
			payeeFspFee: quote.payeeFspFee,
			extensionList: quote.extensionList as IExtensionList,
			geoCode: quote.geoCode as IGeoCode,
			payeeFspCommission:	quote.feesPayer as IMoney,
		};

		const event = new QuoteQueryResponseEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}
	//#endregion

	//#region handleBulkQuoteRequestedEvt
	private async handleBulkQuoteRequestedEvent(message: BulkQuoteRequestedEvt):Promise<DomainEventMsg> {
		const bulkQuoteId = message.payload.bulkQuoteId;
		this._logger.debug(`Got handleBulkQuoteRequestedEvt msg for quoteId: ${message.payload.bulkQuoteId}`);
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const expirationDate = message.payload.expiration ?? null;
		const individualQuotesInsideBulkQuote = message.payload.individualQuotes as unknown as IQuote[];

		if(individualQuotesInsideBulkQuote.length <= 0){
			const errorPayload : QuoteBCInvalidBulkQuoteLengthErrorPayload = {
				errorDescription:`BulkQuote ${bulkQuoteId} has no individual quotes`,
				fspId: requesterFspId,
				bulkQuoteId
			};
			const errorEvent = new QuoteBCInvalidBulkQuoteLengthErrorEvent(errorPayload);
			return errorEvent;
		}

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId, bulkQuoteId, null);
		if(requesterParticipantError){
			return requesterParticipantError;
		}

		let destinationFspId =  message.fspiopOpaqueState.destinationFspId;

		if(!destinationFspId){
			for await (const quote of individualQuotesInsideBulkQuote) {
				const payeePartyId = quote.payee?.partyIdInfo?.partyIdentifier;
				const payeePartyIdType = quote.payee?.partyIdInfo?.partyIdType;

				if (!quote.payee.partyIdInfo.fspId && payeePartyId && payeePartyIdType) {
					const currency = quote.amount?.currency ?? null;
					this._logger.debug(`Getting destinationFspId for payeePartyId: ${payeePartyId}, and payeePartyType: ${payeePartyIdType}, and currency :${currency} from account lookup service`);
					destinationFspId = await this._accountLookupService.getAccountLookup(payeePartyId, payeePartyIdType, currency);
					this._logger.debug(`Got destinationFspId from account lookup service: ${destinationFspId ?? null}`);

					if (destinationFspId) {
						this._logger.debug(`Got destinationFspId from account lookup service: ${destinationFspId}`);
						break;
					}
				}
			}
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, null, bulkQuoteId);
		if(destinationParticipantError){
			return destinationParticipantError;
		}

		if(expirationDate){
			const expirationDateError = this.validateExpirationDateOrGetErrorEvent(requesterFspId, null, bulkQuoteId, expirationDate);
			if(expirationDateError){
				return expirationDateError;
			}
		}

		const bulkQuote: IBulkQuote = {
			bulkQuoteId,
			payer: message.payload.payer,
			geoCode: message.payload.geoCode,
			expiration: message.payload.expiration,
			individualQuotes: individualQuotesInsideBulkQuote as IQuote[],
			extensionList: message.payload.extensionList,
			quotesNotProcessedIds: [],
			status: QuoteStatus.PENDING
		};

		if(!this._passThroughMode)
		{
			try{
				await this.addBulkQuote(bulkQuote);
			}
			catch(error:any){
				this._logger.error(`Error adding bulk quote ${bulkQuoteId} to database: ${error.message}`);
				const errorPayload : QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload = {
					errorDescription: `Error adding bulk quote ${bulkQuoteId} to database`,
					fspId: requesterFspId,
					bulkQuoteId
				};
				const errorEvent = new QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		const payload : BulkQuoteReceivedEvtPayload = {
			bulkQuoteId,
			payer: message.payload.payer,
			geoCode: message.payload.geoCode,
			expiration: expirationDate,
			//TODO: fix this to be of type IQuote[]
			individualQuotes: individualQuotesInsideBulkQuote as any,
			extensionList: message.payload.extensionList
		};

		const event = new BulkQuoteReceivedEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}

	//#endregion

	//#region handleBulkQuotePendingReceivedEvt
	private async handleBulkQuotePendingReceivedEvent(message: BulkQuotePendingReceivedEvt):Promise<DomainEventMsg> {
		const bulkQuoteId = message.payload.bulkQuoteId;
		this._logger.debug(`Got BulkQuotePendingReceivedEvt msg for bulkQuoteId:${bulkQuoteId} and bulkQuotes: ${message.payload.individualQuoteResults}`);
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		const expirationDate = message.payload.expiration;
		let bulkQuoteErrorEvent: DomainEventMsg|null = null;
		let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId,null, bulkQuoteId);
		if(requesterParticipantError){
			bulkQuoteErrorEvent = requesterParticipantError;
			quoteStatus = QuoteStatus.REJECTED;
		}

		if(bulkQuoteErrorEvent === null){
			const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId,null, bulkQuoteId);
			if(destinationParticipantError){
				bulkQuoteErrorEvent = destinationParticipantError;
				quoteStatus = QuoteStatus.REJECTED;
			}
		}

		if(bulkQuoteErrorEvent === null && expirationDate){
			const expirationDateError = this.validateExpirationDateOrGetErrorEvent(requesterFspId, null, bulkQuoteId, expirationDate);
			if(expirationDateError){
				bulkQuoteErrorEvent = expirationDateError;
				quoteStatus = QuoteStatus.EXPIRED;
			}
		}

		const quotes = message.payload.individualQuoteResults as IQuote[];

		if(!this._passThroughMode){

			try{
				await this.updateBulkQuote(bulkQuoteId,requesterFspId,destinationFspId,expirationDate, quoteStatus, quotes);
			}
			catch(error:any) {
				this._logger.error(`Error updating bulk quote ${bulkQuoteId} in database: ${error.message}`);
				const errorPayload : QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload = {
					errorDescription: "Error updating bulk quote in database",
					fspId: requesterFspId,
					bulkQuoteId
				};
				const errorEvent = new QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		//If there was any error during prior validation, return the error event
		if(bulkQuoteErrorEvent!==null){
			return bulkQuoteErrorEvent;
		}

		const payload : BulkQuoteAcceptedEvtPayload = {
			bulkQuoteId: message.payload.bulkQuoteId,
			individualQuoteResults: message.payload.individualQuoteResults,
			expiration: message.payload.expiration,
			extensionList: message.payload.extensionList,
		};

		const event = new BulkQuoteAcceptedEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;

	}
	//#endregion

	//#region Quotes database operations

	private async addBulkQuote(bulkQuote:IBulkQuote): Promise<void>{
		//Add bulkQuote to database and iterate through quotes to add them to database
		await this._bulkQuotesRepo.addBulkQuote(bulkQuote).catch((err) => {
			const errorMessage = `Error adding bulkQuote for bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			throw new Error(errorMessage);
		});

		const quotes = bulkQuote.individualQuotes;

		for await (const quote of quotes) {
			quote.bulkQuoteId = bulkQuote.bulkQuoteId;
			quote.status = QuoteStatus.PENDING;
			await this._quotesRepo.addQuote(quote).catch((err) => {
				const errorMessage = `Error adding quote for quoteId: ${quote.quoteId} in bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
				this._logger.error(errorMessage + " " + err.message);
				throw new Error(`Error adding quote for quoteId: ${quote.quoteId} in bulkQuoteId: ${bulkQuote.bulkQuoteId}.`);
			});
		}
	}

	private async updateBulkQuote(bulkQuoteId:string, requesterFspId:string, destinationFspId:string, expiration:string | null, status:QuoteStatus, quotes: IQuote[]): Promise<void> {
		const bulkQuote = await this._bulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

		if (!bulkQuote) {
			const errorMessage = `Bulk Quote not found for bulkQuoteId: ${bulkQuoteId}`;
			this._logger.error(errorMessage);
			throw new Error(errorMessage);
		}

		const quotesInBulkQUote = await this._quotesRepo.getQuotesByBulkQuoteId(bulkQuoteId);

		for await (const individualQuote of quotesInBulkQUote) {

			individualQuote.requesterFspId = requesterFspId;
			individualQuote.destinationFspId = destinationFspId;
			individualQuote.quoteId = individualQuote.quoteId;
			individualQuote.totalTransferAmount = individualQuote.transferAmount;
			individualQuote.expiration = expiration;
			individualQuote.ilpPacket = individualQuote.ilpPacket;
			individualQuote.condition = individualQuote.condition;
			individualQuote.payeeReceiveAmount = individualQuote.payeeReceiveAmount;
			individualQuote.payeeFspFee = individualQuote.payeeFspFee;
			individualQuote.payeeFspCommission = individualQuote.payeeFspCommission;
			individualQuote.extensionList = individualQuote.extensionList;
			individualQuote.errorInformation = individualQuote.errorInformation;
			individualQuote.status = status;
		}
		bulkQuote.status = status;

		await this._quotesRepo.updateQuotes(quotesInBulkQUote).catch((err) => {
			const errorMessage = `Error updating multiple quotes for bulkQuoteId: ${bulkQuoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			throw new Error(errorMessage);
		});


		await this._bulkQuotesRepo.updateBulkQuote(bulkQuote).catch((err) => {
			const errorMessage = `Error updating bulkQuote for bulkQuoteId: ${bulkQuoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			throw new Error(errorMessage);
		});

	}

	//#endregion

	//#region Validations

	private validateScheme(message: IMessage) :boolean {
		const currency = message.payload.transferAmount.currency ?? message.payload.amount.currency;
		if(!currency){
			this._logger.error("Currency is not sent in the request");
			return false;
		}

		const currenciesSupported = this._schemeRules.currencies.map((currency) => currency.toLocaleLowerCase());

		if (!currenciesSupported.includes(currency.toLocaleLowerCase())) {
			this._logger.error("Currency is not supported");
			return false;
		}

		return true;
	}


	private validateExpirationDateOrGetErrorEvent(fspId:string, quoteId:string|null, bulkQuoteId:string|null, expirationDate: string): DomainEventMsg | null {
		const serverDateUtc= new Date().toISOString();
		const serverDate = new Date(serverDateUtc);
		const quoteDate = new Date(expirationDate);

		const differenceDate = quoteDate.getTime() - serverDate.getTime();

		if(differenceDate < 0){
			if(bulkQuoteId){
				const errorMessage = `BulkQuote with id ${bulkQuoteId} has expired`;
				this._logger.error(errorMessage);
				const errorPayload: QuoteBCBulkQuoteExpiredErrorPayload = {
					errorDescription: errorMessage,
					fspId,
					bulkQuoteId
				};
				const errorEvent = new QuoteBCBulkQuoteExpiredErrorEvent(errorPayload);
				return errorEvent;
			}
			else{
				const errorMessage = `Quote with id ${quoteId} has expired at ${expirationDate}`;
				this._logger.error(errorMessage);
				const errorPayload : QuoteBCQuoteExpiredErrorPayload = {
					errorDescription:errorMessage,
					fspId,
					quoteId: quoteId as string,
				};
				const errorEvent = new QuoteBCQuoteExpiredErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		return null;
	}

	private validateMessageOrGetErrorEvent(message:IMessage): DomainEventMsg | null {
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const quoteId = message.payload?.quoteId;
		const bulkQuoteId = message.payload?.bulkQuoteId;

		if(!message.payload){
			const errorMessage = "Message payload is null or undefined";
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidMessagePayloadErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId : requesterFspId
			};

			const errorEvent = new QuoteBCInvalidMessagePayloadErrorEvent(errorPayload);
			return errorEvent;
		}

		if(!message.msgName){
			const errorMessage = "Message name is null or undefined";
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidMessageTypeErrorPayload = {
				bulkQuoteId,
				quoteId,
				errorDescription : errorMessage,
				fspId: requesterFspId,
			};
			const errorEvent = new QuoteBCInvalidMessageTypeErrorEvent(errorPayload);
			return errorEvent;
		}

		return null;
	}

	private async validateDestinationParticipantInfoOrGetErrorEvent(participantId: string, quoteId:string|null, bulkQuoteId:string | null):Promise<DomainEventMsg | null>{
		let participant: IParticipant | null = null;

		if(!participantId){
			const errorMessage = `Payee fspId is null or undefined`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		participant = await this._participantService.getParticipantInfo(participantId)
			.catch((error:any) => {
				this._logger.error(`Error getting payee info for id: ${participantId} - ${error?.message}`);
				return null;
			});

		if(!participant) {
			const errorMessage = `Payee participant not found for participantId: ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCParticipantNotFoundErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
			};
			const errorEvent = new QuoteBCParticipantNotFoundErrorEvent(errorPayload);
			return errorEvent;
		}

		if(participant.id !== participantId){
			const errorMessage = `Payee participant id mismatch with expected ${participant.id} - ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
			// 	this._logger.debug(`${participant.id} is not active`);
			// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}

	private async validateRequesterParticipantInfoOrGetErrorEvent(participantId: string, quoteId:string|null, bulkQuoteId:string | null):Promise<DomainEventMsg | null>{
		let participant: IParticipant | null = null;

		if(!participantId){
			const errorMessage = `Payer fspId is null or undefined`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		participant = await this._participantService.getParticipantInfo(participantId)
			.catch((error:any) => {
				this._logger.error(`Error getting payer info for fspId: ${participantId} - ${error?.message}`);
				return null;
			});

		if(!participant) {
			const errorMessage = `Payer participant not found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCParticipantNotFoundErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
			};
			const errorEvent = new QuoteBCParticipantNotFoundErrorEvent(errorPayload);
			return errorEvent;
		}

		if(participant.id !== participantId){
			const errorMessage = `Payee participant fspId mismatch with expected ${participant.id} - ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				fspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
			// 	this._logger.debug(`${participant.id} is not active`);
			// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}
	//#endregion

}
