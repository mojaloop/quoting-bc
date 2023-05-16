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
import { IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
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
	QuoteRequestReceivedEvtPayload,
	QuoteResponseReceivedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IExtensionList, IGeoCode, IMoney, IQuote, IQuoteSchemeRules, QuoteErrorEvent, QuoteStatus, QuoteUpdatableFields } from "./types";
import { createBulkQuoteNotFoundErrorEvent, createInvalidBulkQuoteLengthErrorEvent, createInvalidDestinationFspIdErrorEvent, createInvalidMessageNameErrorEvent, createInvalidMessagePayloadErrorEvent, createInvalidMessageTypeErrorEvent, createInvalidParticipantIdErrorEvent, createParticipantNotFoundErrorEvent, createQuoteExpiredErrorEvent, createQuoteNotFoundErrorEvent, createQuoteRuleSchemeViolated, createUnableToAddBulkQuoteToDatabaseErrorEvent, createUnableToAddQuoteToDatabaseErrorEvent, createUnableToUpdateBulkQuoteInDatabaseErrorEvent, createUnableToUpdateQuoteInDatabaseErrorEvent, createUnknownErrorEvent } from "./error_events";

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
		const eventMessage = this.validateMessageOrGetErrorEvent(message);
		let eventToPublish = null;

		if(!eventMessage.valid){
			const errorEvent = eventMessage.errorEvent as QuoteErrorEvent;
			errorEvent.fspiopOpaqueState = message.fspiopOpaqueState;
			await this.publishEvent(errorEvent);
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
						eventToPublish = createInvalidMessageTypeErrorEvent(errorMessage, requesterFspId, quoteId, bulkQuoteId);
						eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
					}
				}
		}
		catch(error:unknown) {
			const errorMessage = `Error while handling message ${message.msgName}`;
			this._logger.error(errorMessage + `- ${error}`);
			eventToPublish = createUnknownErrorEvent(errorMessage, requesterFspId, quoteId, bulkQuoteId);
			eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
			await this.publishEvent(eventToPublish);
		}

		await this.publishEvent(eventToPublish);
	}

	private async publishEvent(eventToPublish: QuoteRequestAcceptedEvt | QuoteResponseAccepted | QuoteQueryResponseEvt | BulkQuoteReceivedEvt[] | BulkQuoteAcceptedEvt | QuoteErrorEvent| QuoteErrorEvent[]): Promise<void> {
		if (Array.isArray(eventToPublish)) {
			for await (const event of eventToPublish) {
				await this._messageProducer.send(event);
			}
		} else {
			if (eventToPublish){
				await this._messageProducer.send(eventToPublish);
			}
		}
	}
	//#endregion

	//#region handleQuoteRequestReceivedEvt
	private async handleQuoteRequestReceivedEvent(message: QuoteRequestReceivedEvt):Promise<QuoteRequestAcceptedEvt | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);
		const requesterFspId = message.fspiopOpaqueState.requesterFspId ?? null;
		let destinationFspId = message.fspiopOpaqueState?.destinationFspId ?? message.payload?.payee?.partyIdInfo?.fspId;
		const expirationDate = message.payload.expiration ?? null;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
		if(!requesterParticipant.valid){
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const schemeValidationResult = this.validateQuoteRequestSchemeOrGetErrorEvent(requesterFspId, quoteId, message.payload);
		if(!schemeValidationResult.valid){
			return schemeValidationResult.errorEvent as QuoteErrorEvent;
		}

		if(!destinationFspId){
			const payeePartyId = message.payload.payee?.partyIdInfo?.partyIdentifier;
			const payeePartyIdType = message.payload.payee?.partyIdInfo?.partyIdType;
			const currency = message.payload.amount?.currency ?? null;
			destinationFspId = await this.getMissingFspId(payeePartyId, payeePartyIdType, currency);
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);
		if(!destinationParticipant.valid){
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		if(expirationDate){
			const expirationDateValid = this.validateExpirationDateOrGetErrorEvent(requesterFspId, quoteId,null, expirationDate);
			if(!expirationDateValid.valid){
				return expirationDateValid.errorEvent as QuoteErrorEvent;
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
			const quoteAddedToDatabase = await this.addQuoteOrGetErrorEvent(requesterFspId, quote);
			if(!quoteAddedToDatabase.valid){
				return quoteAddedToDatabase.errorEvent as QuoteErrorEvent;
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
	private async handleQuoteResponseReceivedEvent(message: QuoteResponseReceivedEvt):Promise<QuoteResponseAccepted | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		const expirationDate = message.payload.expiration ?? null;
		let quoteErrorEvent: QuoteErrorEvent|null = null;
		let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId,quoteId,null);
		if(!requesterParticipant.valid && quoteErrorEvent === null){
			quoteErrorEvent = requesterParticipant.errorEvent as QuoteErrorEvent;
			quoteStatus = QuoteStatus.REJECTED;
		}

		const schemeValidationResult = this.validateQuoteResponseSchemeOrGetErrorEvent(requesterFspId, quoteId, message.payload);
		if(!schemeValidationResult.valid){
			return schemeValidationResult.errorEvent as QuoteErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);
		if(!destinationParticipant.valid && quoteErrorEvent === null){
			quoteErrorEvent =  destinationParticipant.errorEvent as QuoteErrorEvent;
			quoteStatus = QuoteStatus.REJECTED;
		}

		const expirationDateValid = this.validateExpirationDateOrGetErrorEvent(requesterFspId, quoteId,null, expirationDate);
		if(!expirationDateValid.valid && quoteErrorEvent === null){
			quoteErrorEvent =  expirationDateValid.errorEvent as QuoteErrorEvent;
			quoteStatus = QuoteStatus.EXPIRED;
		}

		if(!this._passThroughMode)
		{
			const quoteResponse: QuoteUpdatableFields = {
				condition: message.payload.condition,
				expiration: message.payload.expiration,
				extensionList: message.payload.extensionList,
				geoCode: message.payload.geoCode,
				ilpPacket: message.payload.ilpPacket,
				payeeFspCommission: message.payload.payeeFspCommission,
				payeeFspFee: message.payload.payeeFspFee,
				payeeReceiveAmount: message.payload.payeeReceiveAmount,
				transferAmount: message.payload.transferAmount,
			};
			const updatedQuote = await this.updateQuoteOrGetErrorEvent(quoteId, requesterFspId, destinationFspId, quoteStatus, quoteResponse);

			if(!updatedQuote.valid){
				return updatedQuote.errorEvent as QuoteErrorEvent;
			}
		}

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
	private async handleQuoteQueryReceivedEvent(message: QuoteQueryReceivedEvt):Promise<QuoteQueryResponseEvt | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
		if(!requesterParticipant.valid){
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);
		if(!destinationParticipant.valid){
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		const quote = await this._quotesRepo.getQuoteById(quoteId);

		if(!quote) {
			const errorEvent = createQuoteNotFoundErrorEvent(`Quote ${quoteId} not found`, requesterFspId, quoteId);
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
	private async handleBulkQuoteRequestedEvent(message: BulkQuoteRequestedEvt):Promise<BulkQuoteReceivedEvt[] | QuoteErrorEvent> {
		const bulkQuoteId = message.payload.bulkQuoteId;
		this._logger.debug(`Got handleBulkQuoteRequestedEvt msg for quoteId: ${message.payload.bulkQuoteId}`);
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const expirationDate = message.payload.expiration ?? null;
		const events: BulkQuoteReceivedEvt[] = [];
		const individualQuotesInsideBulkQuote = message.payload.individualQuotes as unknown as IQuote[];

		if(individualQuotesInsideBulkQuote.length <= 0){
			return createInvalidBulkQuoteLengthErrorEvent(`BulkQuote ${bulkQuoteId} has no individual quotes`, requesterFspId, bulkQuoteId);
		}

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId, bulkQuoteId, null);
		if(!requesterParticipant.valid){
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		let destinationFspId =  message.fspiopOpaqueState.destinationFspId;
		if(!destinationFspId){
			const destinationFspIdFromIndividualQuotes = this.getMissingFspIdForBulkQuote(individualQuotesInsideBulkQuote);
			if(destinationFspIdFromIndividualQuotes){
				destinationFspId = destinationFspIdFromIndividualQuotes;
			}
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, null, bulkQuoteId, true);
		if(!destinationParticipant.valid){
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		if(expirationDate){
			const expirationDateValid = this.validateExpirationDateOrGetErrorEvent(requesterFspId, bulkQuoteId, null, expirationDate);
			if(!expirationDateValid.valid){
				return expirationDateValid.errorEvent as QuoteErrorEvent;
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
			const addedBulkQuote = await this.addBulkQuoteOrGetErrorEvent(requesterFspId, bulkQuote);
			if(!addedBulkQuote.valid){
				return addedBulkQuote.errorEvent as QuoteErrorEvent;
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

		events.push(event);

		return events;
	}

	//#endregion

	//#region handleBulkQuotePendingReceivedEvt
	private async handleBulkQuotePendingReceivedEvent(message: BulkQuotePendingReceivedEvt):Promise<BulkQuoteAcceptedEvt | QuoteErrorEvent | QuoteErrorEvent[]> {
		const bulkQuoteId = message.payload.bulkQuoteId;
		this._logger.debug(`Got BulkQuotePendingReceivedEvt msg for bulkQuoteId:${bulkQuoteId} and bulkQuotes: ${message.payload.individualQuoteResults}`);
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		const expirationDate = message.payload.expiration;
		let quoteErrorEvent: QuoteErrorEvent|null = null;
		let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId,null, bulkQuoteId);
		if(!requesterParticipant.valid){
			quoteErrorEvent = requesterParticipant.errorEvent as QuoteErrorEvent;
			quoteStatus = QuoteStatus.REJECTED;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId,null, bulkQuoteId, true);
		if(!destinationParticipant.valid && quoteErrorEvent === null){
			quoteErrorEvent = destinationParticipant.errorEvent as QuoteErrorEvent;
			quoteStatus = QuoteStatus.REJECTED;
		}

		if(expirationDate){
			const expirationDateValid = this.validateExpirationDateOrGetErrorEvent(requesterFspId, bulkQuoteId, null, expirationDate);
			if(!expirationDateValid.valid && quoteErrorEvent === null){
				quoteErrorEvent = expirationDateValid.errorEvent as QuoteErrorEvent;
				quoteStatus = QuoteStatus.EXPIRED;
			}
		}

		const quotes = message.payload.individualQuoteResults as IQuote[];

		if(!this._passThroughMode){
			const updatedBulkQuote = await this.updateBulkQuoteOrGetErrorEvent(bulkQuoteId,requesterFspId,destinationFspId,expirationDate, quoteStatus, quotes);
			if(!updatedBulkQuote.valid){
				const quoteErrorEvents = updatedBulkQuote.errorEvent as QuoteErrorEvent[];
				return quoteErrorEvents;
			}
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
	private async addQuoteOrGetErrorEvent(fspId:string, quote: IQuote): Promise<{errorEvent: QuoteErrorEvent| null, valid: boolean}> {
		let errorEvent!: QuoteErrorEvent | null;
		const result = { errorEvent, valid: false };

		const quoteAddedToDatabase = await this._quotesRepo.addQuote(quote)
			.catch((err) => {
				this._logger.error(`Error adding quote ${quote.quoteId} to database - ${err.message}`);
				return false;
			});

		if(!quoteAddedToDatabase){
			const errorEvent = createUnableToAddQuoteToDatabaseErrorEvent(`Error adding quote to database`, fspId, quote.quoteId);
			return errorEvent;
		}

		result.valid = true;
		return result;
	}

	private async updateQuoteOrGetErrorEvent(quoteId:string, requesterFspId: string, destinationFspId:string, status:QuoteStatus, quote: QuoteUpdatableFields): Promise<{errorEvent: QuoteErrorEvent| null, valid: boolean}> {
		let errorEvent!: QuoteErrorEvent | null;
		const result = { errorEvent, valid: false };

		const quoteInDatabase = await this._quotesRepo.getQuoteById(quoteId);

		if (!quoteInDatabase) {
			const errorMessage = `Quote not found for quoteId: ${quoteId}`;
			this._logger.error(errorMessage);
			result.errorEvent = createQuoteNotFoundErrorEvent(errorMessage, requesterFspId, quoteId);
			return result;
		}

		quoteInDatabase.requesterFspId = requesterFspId;
		quoteInDatabase.destinationFspId = destinationFspId;
		quoteInDatabase.quoteId = quoteId;
		quoteInDatabase.totalTransferAmount = quote.transferAmount;
		quoteInDatabase.expiration = quote.expiration;
		quoteInDatabase.ilpPacket = quote.ilpPacket;
		quoteInDatabase.condition = quote.condition;
		quoteInDatabase.payeeReceiveAmount = quote.payeeReceiveAmount;
		quoteInDatabase.payeeFspFee = quote.payeeFspFee;
		quoteInDatabase.payeeFspCommission = quote.payeeFspCommission;
		quoteInDatabase.geoCode = quote.geoCode;
		quoteInDatabase.extensionList = quote.extensionList;
		quoteInDatabase.status = status;

		const quoteUpdated = await this._quotesRepo.updateQuote(quoteInDatabase).catch((err) => {
			const errorMessage = `Error updating quote for quoteId: ${quoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			result.errorEvent = createUnableToUpdateQuoteInDatabaseErrorEvent(errorMessage, requesterFspId, quoteId);
			result.valid = false;
			return false;
		});

		if (!quoteUpdated) {
			return result;
		}

		result.valid = true;
		return result;
	}

	private async addBulkQuoteOrGetErrorEvent(fspId:string, bulkQuote:IBulkQuote): Promise<{errorEvent: QuoteErrorEvent| null, valid:boolean}>{
		let errorEvent!: QuoteErrorEvent | null;
		const result = { errorEvent, valid: false };

		//Add bulkQuote to database and iterate through quotes to add them to database
		const bulkQuoteAdded = await this._bulkQuotesRepo.addBulkQuote(bulkQuote).catch((err) => {
			const errorMessage = `Error adding bulkQuote for bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			result.errorEvent = createUnableToAddBulkQuoteToDatabaseErrorEvent(errorMessage, fspId, bulkQuote.bulkQuoteId);
			result.valid = false;
			return false;
		});

		if (!bulkQuoteAdded) {
			return result;
		}

		const quotes = bulkQuote.individualQuotes;

		for await (const quote of quotes) {
			quote.bulkQuoteId = bulkQuote.bulkQuoteId;
			quote.status = QuoteStatus.PENDING;
			const quoteAdded = await this._quotesRepo.addQuote(quote).catch((err) => {
				const errorMessage = `Error adding quote for quoteId: ${quote.quoteId} in bulkQuoteId: ${bulkQuote.bulkQuoteId}.`;
				this._logger.error(errorMessage + " " + err.message);
				result.errorEvent = createUnableToAddQuoteToDatabaseErrorEvent(errorMessage, quote.requesterFspId, quote.quoteId);
				result.valid = false;
				return false;
			});

			if (!quoteAdded) {
				return result;
			}
		}

		result.valid = true;
		return result;
	}

	private async updateBulkQuoteOrGetErrorEvent(bulkQuoteId:string, requesterFspId:string, destinationFspId:string, expiration:string | null, status:QuoteStatus, quotes: IQuote[]): Promise< { errorEvent:QuoteErrorEvent[], valid:boolean}> {
		let errorEvent!: QuoteErrorEvent[];
		const result = { errorEvent, valid: false };
		const bulkQuote = await this._bulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

		if (!bulkQuote) {
			const errorMessage = `Bulk Quote not found for bulkQuoteId: ${bulkQuoteId}`;
			this._logger.error(errorMessage);
			result.errorEvent.push(createBulkQuoteNotFoundErrorEvent(errorMessage, requesterFspId, bulkQuoteId));
			return result;
		}

		for await (const individualQuote of quotes) {
			const quote = await this._quotesRepo.getQuoteById(individualQuote.quoteId);

			if (!quote) {
				const errorMessage = `Quote not found for quoteId: ${individualQuote.quoteId} in bulkQuoteId: ${bulkQuoteId}`;
				this._logger.error(errorMessage);
				errorEvent.push(createQuoteNotFoundErrorEvent(errorMessage, requesterFspId, individualQuote.quoteId));
				result.valid = false;
			}

			else{
				quote.requesterFspId = requesterFspId;
				quote.destinationFspId = destinationFspId;
				quote.quoteId = individualQuote.quoteId;
				quote.totalTransferAmount = individualQuote.transferAmount;
				quote.expiration = expiration;
				quote.ilpPacket = individualQuote.ilpPacket;
				quote.condition = individualQuote.condition;
				quote.payeeReceiveAmount = individualQuote.payeeReceiveAmount;
				quote.payeeFspFee = individualQuote.payeeFspFee;
				quote.payeeFspCommission = individualQuote.payeeFspCommission;
				quote.extensionList = individualQuote.extensionList;
				quote.errorInformation = individualQuote.errorInformation;
				quote.status = status;

				await this._quotesRepo.updateQuote(quote).catch((err) => {
					const errorMessage = `Error updating quote for quoteId: ${individualQuote.quoteId} in bulkQuoteId: ${bulkQuoteId}.`;
					this._logger.error(errorMessage + " " + err.message);
					errorEvent.push(createUnableToUpdateQuoteInDatabaseErrorEvent(errorMessage, requesterFspId, individualQuote.quoteId));
					result.valid = false;
				});
			}
		}

		if(errorEvent.length > 0){
			return result;
		}

		bulkQuote.status = status;

		const updateBulkQuote = await this._bulkQuotesRepo.updateBulkQuote(bulkQuote).catch((err) => {
			const errorMessage = `Error updating bulkQuote for bulkQuoteId: ${bulkQuoteId}.`;
			this._logger.error(errorMessage + " " + err.message);
			result.errorEvent.push(createUnableToUpdateBulkQuoteInDatabaseErrorEvent(errorMessage, requesterFspId, bulkQuoteId));
			result.valid = false;
			return false;
		});

		if (!updateBulkQuote) {
			return result;
		}

		result.valid = true;

		return result;
	}

	//#endregion

	//#region Account Lookup Service
	private async getMissingFspId(payeePartyId: string | null, payeePartyIdType: string | null, currency: string | null) {
		if (!payeePartyId || !payeePartyIdType) {
			this._logger.error("No payeePartyId or payeePartyIdType passed to getMissingFspId");
			return null;
		}

		this._logger.debug(`No destinationFspId found in message, trying to get it from account lookup service for payee: ${payeePartyId}`);

		const destinationFspId = await this._accountLookupService.getAccountLookup(payeePartyId, payeePartyIdType, currency);

		if (destinationFspId) {
			this._logger.debug(`Got destinationFspId from account lookup service: ${destinationFspId}`);
		}
		else {
			this._logger.error(`Unable to get destinationFspId from account lookup service for payee: ${payeePartyId}`);
		}
		return destinationFspId;
	}

	private async getMissingFspIdForBulkQuote(quotes:IQuote[]): Promise<string | null>{
		let destinationFspId = null;
		for await (const quote of quotes) {
			if (!quote.payee.partyIdInfo.fspId) {
				const payeePartyId = quote.payee?.partyIdInfo?.partyIdentifier;
				const payeePartyIdType = quote.payee?.partyIdInfo?.partyIdType;
				if(payeePartyId && payeePartyIdType){
					const currency = quote.amount?.currency ?? null;
					this._logger.debug(`Getting destinationFspId for payeePartyId: ${payeePartyId}, and payeePartyType: ${payeePartyIdType}, and currency :${currency} from account lookup service`);
					destinationFspId = await this.getMissingFspId(payeePartyId, payeePartyIdType, currency);
					if (destinationFspId) {
						this._logger.debug(`Got destinationFspId from account lookup service: ${destinationFspId}`);
						return destinationFspId;
					}
				}
			}
		}
		return destinationFspId;
	}

	//#endregion

	//#region Validations
	private validateQuoteRequestSchemeOrGetErrorEvent(fspId:string, quoteId:string, quote: QuoteRequestReceivedEvtPayload ): {errorEvent:QuoteErrorEvent | null, valid: boolean} {
		const currency = quote.amount.currency;
		return this.schemeValidation(currency, fspId, quoteId);
	}

	private validateQuoteResponseSchemeOrGetErrorEvent(fspId:string, quoteId:string, quote: QuoteResponseReceivedEvtPayload ): {errorEvent: QuoteErrorEvent | null, valid: boolean} {
		const currency = quote.transferAmount.currency;
		return this.schemeValidation(currency, fspId, quoteId);
	}

	private schemeValidation(currency: string, fspId: string, quoteId: string) :{errorEvent:QuoteErrorEvent | null, valid: boolean}  {
		let errorEvent!:QuoteErrorEvent | null;
		const result = {errorEvent, valid: false};

		const currenciesSupported = this._schemeRules.currencies.map((currency) => currency.toLocaleLowerCase());
		if (currency) {
			if (!currenciesSupported.includes(currency)) {
				const errorMessage = "Currency is not supported";
				this._logger.error(errorMessage);
				result.errorEvent = createQuoteRuleSchemeViolated(errorMessage, fspId, quoteId);
				return result;
			}
		}
		else {
			const errorMessage = "Currency is not provided in quote request";
			this._logger.error(errorMessage);
			result.errorEvent = createQuoteRuleSchemeViolated(errorMessage, fspId, quoteId);
			return result;
		}

		result.valid = true;
		return result;
	}



	private validateExpirationDateOrGetErrorEvent(fspId:string, quoteId:string|null, bulkQuoteId:string|null, expirationDate: string): {errorEvent:QuoteErrorEvent | null, valid: boolean} {
		let errorEvent!:QuoteErrorEvent | null;
		const result = {errorEvent, valid: false};
		const serverDateUtc= new Date().toISOString();
		const serverDate = new Date(serverDateUtc);
		const quoteDate = new Date(expirationDate);

		const differenceDate = quoteDate.getTime() - serverDate.getTime();

		if(differenceDate < 0){
			const errorMessage = (bulkQuoteId) ? `BulkQuote with id ${bulkQuoteId} has expired`  : `Quote with id ${quoteId} has expired` + ` at ${expirationDate}`;
			this._logger.error(errorMessage);
			result.errorEvent = createQuoteExpiredErrorEvent(errorMessage, fspId, quoteId , bulkQuoteId);
		}
		else{
			result.valid = true;
		}
		return result;
	}

	private validateMessageOrGetErrorEvent(message:IMessage): {errorEvent:QuoteErrorEvent | null, valid: boolean} {
		let errorEvent!:QuoteErrorEvent | null;
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const quoteId = message.payload?.quoteId;
		const bulkQuoteId = message.payload?.bulkQuoteId;
		const result = {errorEvent, valid: false};

		if(!message.payload){
			const errorMessage = "Message payload is null or undefined";
			this._logger.error(errorMessage);
			result.errorEvent = createInvalidMessagePayloadErrorEvent(errorMessage,requesterFspId,quoteId,bulkQuoteId);
			return result;
		}

		if(!message.msgName){
			const errorMessage = "Message name is null or undefined";
			this._logger.error(errorMessage);
			result.errorEvent = createInvalidMessageTypeErrorEvent(errorMessage,requesterFspId,quoteId,bulkQuoteId);
			return result;
		}

		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			const errorMessage = `Message type is invalid ${message.msgType}`;
			this._logger.error(errorMessage);
			result.errorEvent = createInvalidMessageTypeErrorEvent(errorMessage,requesterFspId,quoteId,bulkQuoteId);
			return result;
		}

		result.valid = true;

		return result;
	}

	private async validateParticipantInfoOrGetErrorEvent(participantId: string, quoteId:string|null, bulkQuoteId:string | null, isDestinationParticipant = false):Promise<{errorEvent:QuoteErrorEvent | null, valid: boolean}>{
		let errorEvent!: QuoteErrorEvent | null;
		const result = { errorEvent, valid: false };
		let participant: IParticipant | null = null;

		if(!participantId){
			const errorMessage = `${(isDestinationParticipant)?"Destination":"Requester"} fspId is null or undefined`;
			this._logger.error(errorMessage);
			errorEvent = createInvalidDestinationFspIdErrorEvent(errorMessage, participantId, quoteId, bulkQuoteId);
			result.errorEvent = errorEvent;
			return result;
		}

		participant = await this._participantService.getParticipantInfo(participantId)
			.catch((error:any) => {
				this._logger.error(`Error getting participant info for participantId: ${participantId} - ${error?.message}`);
				return null;
			});

		if(!participant) {
			const errorMessage = `No ${(isDestinationParticipant)?"destination":"requester"} participant found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			errorEvent = createParticipantNotFoundErrorEvent(errorMessage,participantId, quoteId, bulkQuoteId);
			result.errorEvent = errorEvent;
			return result;
		}

		if(participant.id !== participantId){
			const errorMessage = `${(isDestinationParticipant)?"Destination":"Requester"} participant id mismatch ${participant.id} - ${participantId}`;
			this._logger.error(errorMessage);
			errorEvent = createInvalidParticipantIdErrorEvent(errorMessage,participantId, quoteId, bulkQuoteId);
			result.errorEvent = errorEvent;
			return result;
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
			// 	this._logger.debug(`${participant.id} is not active`);
			// 	throw new RequiredParticipantIsNotActive();
		// }
		result.valid = true;

		return result;
	}
	//#endregion

}
