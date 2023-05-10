import { IParticipant } from '@mojaloop/participant-bc-public-types-lib';
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
import { IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
	BulkQuoteNotFoundError,
	InvalidDestinationPartyInformationError, QuoteNotFoundError,
} from "./errors";
import { AccountLookupBulkQuoteFspIdRequest, IAccountLookupService, IBulkQuoteRepo, IParticipantService, IQuoteRepo} from "./interfaces/infrastructure";
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
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IExtensionList, IGeoCode, IMoney, IQuote, QuoteErrorEvent, QuoteStatus } from "./types";
import { randomUUID } from "crypto";
import { createInvalidMessageNameErrorEvent, createInvalidMessagePayloadErrorEvent, createInvalidMessageTypeErrorEvent, createInvalidParticipantIdErrorEvent, createParticipantNotFoundErrorEvent, createUnknownErrorEvent } from "./error_events";

export class QuotingAggregate  {
	private readonly _logger: ILogger;
	private readonly _quotesRepo: IQuoteRepo;
	private readonly _bulkQuotesRepo: IBulkQuoteRepo;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	private readonly _accountLookupService: IAccountLookupService;
	private readonly _passThroughMode: boolean;

	constructor(
		logger: ILogger,
		quoteRepo:IQuoteRepo,
		bulkQuoteRepo:IBulkQuoteRepo,
		messageProducer:IMessageProducer,
		participantService: IParticipantService,
		accountLookupService: IAccountLookupService,
		passThroughMode: boolean
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._quotesRepo = quoteRepo;
		this._bulkQuotesRepo = bulkQuoteRepo;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
		this._accountLookupService = accountLookupService;
		this._passThroughMode = passThroughMode ?? false;
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
			await this.publishEvent(message.fspiopOpaqueState, errorEvent);
			return;
		}

		try{
			switch(message.msgName){
				case QuoteRequestReceivedEvt.name:
					eventToPublish = await this.handleQuoteRequestReceivedEvt(message as QuoteRequestReceivedEvt);
					break;
				case QuoteResponseReceivedEvt.name:
					eventToPublish = await this.handleQuoteResponseReceivedEvt(message as QuoteResponseReceivedEvt);
					break;
				case QuoteQueryReceivedEvt.name:
					eventToPublish = await this.handleQuoteQueryReceivedEvt(message as QuoteQueryReceivedEvt);
					break;
				case BulkQuoteRequestedEvt.name:
					eventToPublish = await this.handleBulkQuoteRequestedEvt(message as BulkQuoteRequestedEvt);
					break;
				case BulkQuotePendingReceivedEvt.name:
					eventToPublish = await this.handleBulkQuotePendingReceivedEvt(message as BulkQuotePendingReceivedEvt);
					break;
				default:{
						const errorMessage = `Message type has invalid format or value ${message.msgName}`;
						this._logger.error(errorMessage);
						eventToPublish = createInvalidMessageTypeErrorEvent(errorMessage, requesterFspId, quoteId, bulkQuoteId);
					}

				}
		}
		catch(error:unknown) {
			const errorMessage = `Error while handling message ${message.msgName}`;
			this._logger.error(errorMessage + `- ${error}`);
			eventToPublish = createUnknownErrorEvent(errorMessage, requesterFspId, quoteId, bulkQuoteId);
			await this.publishEvent(message.fspiopOpaqueState, eventToPublish);
		}
	}

	private async publishEvent(fspiopOpaqueState: object, eventToPublish: QuoteRequestAcceptedEvt | QuoteResponseAccepted | QuoteQueryResponseEvt | BulkQuoteReceivedEvt[] | BulkQuoteAcceptedEvt | QuoteErrorEvent): Promise<void> {
		if (Array.isArray(eventToPublish)) {
			for await (const event of eventToPublish) {
				event.fspiopOpaqueState = fspiopOpaqueState;
				await this._messageProducer.send(event);
			}
		} else {
			eventToPublish.fspiopOpaqueState = fspiopOpaqueState;
			await this._messageProducer.send(eventToPublish);
		}
	}
	//#endregion

	//#region handleQuoteRequestReceivedEvt
	private async handleQuoteRequestReceivedEvt(message: QuoteRequestReceivedEvt):Promise<QuoteRequestAcceptedEvt | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		const requesterFspId = message.fspiopOpaqueState.requesterFspId ?? null;
		let destinationFspId = message.fspiopOpaqueState?.destinationFspId ?? message.payload?.payee?.partyIdInfo?.fspId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId,quoteId,null);
		if(!requesterParticipant.valid){
			this._logger.error(`Requester participant ${requesterFspId} is invalid for quoteId: ${quoteId}`);
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		if(!destinationFspId){
			const payeePartyId = message.payload.payee?.partyIdInfo?.partyIdentifier;
			const payeePartyIdType = message.payload.payee?.partyIdInfo?.partyIdType;
			const currency = message.payload.amount?.currency ?? null;
			destinationFspId = await this.getMissingFspId(payeePartyId, payeePartyIdType, currency);
			message.payload.payee.partyIdInfo.fspId = destinationFspId;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);

		if(!destinationParticipant.valid){
			this._logger.error(`Destination participant ${destinationFspId} is invalid for quoteId: ${quoteId}`);
			return destinationParticipant.errorEvent as QuoteErrorEvent;
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
			errorInformation: null
		};

		if(!this._passThroughMode)
		{
			await this._quotesRepo.addQuote(quote);
		}

		const payload : QuoteRequestAcceptedEvtPayload = {
			quoteId: message.payload.quoteId,
			transactionId: message.payload.transactionId,
			transactionRequestId: message.payload.transactionRequestId,
			payee: message.payload.payee,
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
	private async handleQuoteResponseReceivedEvt(message: QuoteResponseReceivedEvt):Promise<QuoteResponseAccepted | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId,quoteId,null);
		if(!requesterParticipant.valid){
			this._logger.error(`Requester participant ${requesterFspId} is invalid for quoteId: ${quoteId}`);
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);
		if(!destinationParticipant.valid){
			this._logger.error(`Destination participant ${destinationFspId} is invalid for quoteId: ${quoteId}`);
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		if(!this._passThroughMode)
		{
			await this.updateQuote(message);
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
            extensionList: message.payload.extensionList
		};

		const event = new QuoteResponseAccepted(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}
	//#endregion

	//#region handleQuoteQueryReceivedEvt
	private async handleQuoteQueryReceivedEvt(message: QuoteQueryReceivedEvt):Promise<QuoteQueryResponseEvt | QuoteErrorEvent> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId} and quoteId: ${quoteId}`)
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null, true);
		if(!destinationParticipant.valid){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId} and quoteId: ${quoteId}`)
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		const quote = await this._quotesRepo.getQuoteById(quoteId);

		if(!quote) {
			throw new QuoteNotFoundError(`Quote with id: ${quoteId} not found`);
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
	private async handleBulkQuoteRequestedEvt(message: BulkQuoteRequestedEvt):Promise<BulkQuoteReceivedEvt[] | QuoteErrorEvent> {
		let bulkQuoteId = message.payload.bulkQuoteId;
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const events:BulkQuoteReceivedEvt[] = [];
		const quotes = message.payload.individualQuotes as unknown as IQuote[];
		const validQuotes:{ [key: string]: IQuote[] } = {};
		const quotesNotProcessedIds: string[] = [];
		this._logger.debug(`Got handleBulkQuoteRequestedEvt msg for quoteId: ${message.payload.bulkQuoteId}`);

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId, bulkQuoteId, null);
		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId} and bulkQuoteId: ${bulkQuoteId}`)
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const bulkQuote: IBulkQuote = {
			bulkQuoteId,
			payer: message.payload.payer,
			geoCode: message.payload.geoCode,
			expiration: message.payload.expiration,
			individualQuotes: message.payload.individualQuotes?.map(q => q.quoteId),
			extensionList: message.payload.extensionList,
			quotesNotProcessedIds: [],
			status: QuoteStatus.PENDING
		};

		if(!this._passThroughMode)
		{
			bulkQuoteId = await this._bulkQuotesRepo.addBulkQuote(bulkQuote);
		}
		else{
			bulkQuoteId = bulkQuoteId ?? randomUUID();
		}

		const missingFspIdsInQuotes = await this.getMissingFspIds(quotes) ?? {};

		for (const fspId in missingFspIdsInQuotes) {
			const existingFspId = missingFspIdsInQuotes[fspId] as string;

			if(existingFspId) {
				validQuotes[existingFspId] = [];
			}
		}

		await this.processBulkQuotes(bulkQuoteId, quotes, message, missingFspIdsInQuotes, validQuotes, quotesNotProcessedIds);

		if(!this._passThroughMode){
			await this.updateBulkQuoteStatus(bulkQuoteId, quotes, quotesNotProcessedIds);
		}

		for (const fspId in validQuotes) {
			const payload : BulkQuoteReceivedEvtPayload = {
				bulkQuoteId,
				payer: message.payload.payer,
				geoCode: message.payload.geoCode,
				expiration: message.payload.expiration,
				individualQuotes: validQuotes[fspId] as any,
				extensionList: message.payload.extensionList
			};

			const event = new BulkQuoteReceivedEvt(payload);

			event.fspiopOpaqueState = { ...message.fspiopOpaqueState };
			event.fspiopOpaqueState.headers = { ...message.fspiopOpaqueState.headers, "fspiop-destination": fspId };

			events.push(event);
		}

		return events;

	}

	private async processBulkQuotes(bulkQuoteId: string, quotes: IQuote[], message: BulkQuoteRequestedEvt, fspIds: { [key: string]: string | null; },
		validQuotes: { [key: string]: IQuote[]; }, quotesNotProcessedIds: string[]) {

		for await (const quote of quotes) {
			const destinationFspId = quote.payee?.partyIdInfo?.fspId ?? fspIds[quote.quoteId] ?? null;
			const quoteId = quote.quoteId;
			quote.payer = message.payload.payer;

			if (!destinationFspId) {
				quote.status = QuoteStatus.REJECTED;
				quotesNotProcessedIds.push(quoteId);
			}
			else {
				const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId,quoteId,null,true);
				if (destinationParticipant.valid) {
					if (!validQuotes[destinationFspId]) {
						validQuotes[destinationFspId] = [];
					}

					quote.bulkQuoteId = bulkQuoteId;
					quote.status = QuoteStatus.PENDING;
					quote.payee.partyIdInfo.fspId = destinationFspId;
					validQuotes[destinationFspId].push(quote);
				} else {
					quote.status = QuoteStatus.REJECTED;
					quotesNotProcessedIds.push(quote.quoteId);
				}
			}

			if(!this._passThroughMode){
				await this._quotesRepo.addQuote(quote);
			}
		}
	}
	//#endregion

	//#region handleBulkQuotePendingReceivedEvt
	private async handleBulkQuotePendingReceivedEvt(message: BulkQuotePendingReceivedEvt):Promise<BulkQuoteAcceptedEvt | QuoteErrorEvent> {
		const bulkQuoteId = message.payload.bulkQuoteId;
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		this._logger.debug(`Got BulkQuotePendingReceivedEvt msg for bulkQuoteId:${bulkQuoteId} and bulkQuotes: ${message.payload.individualQuoteResults}`);

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(requesterFspId,null, bulkQuoteId);
		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId} and bulkQuoteId: ${bulkQuoteId}`)
			return requesterParticipant.errorEvent as QuoteErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(destinationFspId,null, bulkQuoteId, true);
		if(!destinationParticipant.valid){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId} and bulkQuoteId: ${bulkQuoteId}`)
			return destinationParticipant.errorEvent as QuoteErrorEvent;
		}

		const quotes = message.payload.individualQuoteResults;

		if(!this._passThroughMode){
			await this.updateBulkQuoteInfo(message, quotes);
		}

		const payload : BulkQuoteAcceptedEvtPayload = {
			bulkQuoteId: message.payload.bulkQuoteId,
			individualQuoteResults: message.payload.individualQuoteResults,
			expiration: message.payload.expiration,
			extensionList: message.payload.extensionList
		};

		const event = new BulkQuoteAcceptedEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;
		event.fspiopOpaqueState.headers = { ...message.fspiopOpaqueState.headers, "fspiop-destination": message.fspiopOpaqueState.destinationFspId, };

		return event;

	}
	//#endregion

	//#region Quotes database operations

	private async updateQuote(message: QuoteResponseReceivedEvt) {
		const quoteId = message.payload.quoteId;
		const quote = await this._quotesRepo.getQuoteById(quoteId);

		if (!quote) {
			throw new QuoteNotFoundError("Quote not found for quoteId: " + quoteId);
		}

		quote.requesterFspId = message.fspiopOpaqueState.requesterFspId;
		quote.destinationFspId = message.fspiopOpaqueState.destinationFspId;
		quote.quoteId = message.payload.quoteId;
		quote.totalTransferAmount = message.payload.transferAmount;
		quote.expiration = message.payload.expiration;
		quote.ilpPacket = message.payload.ilpPacket;
		quote.condition = message.payload.condition;
		quote.payeeReceiveAmount = message.payload.payeeReceiveAmount;
		quote.payeeFspFee = message.payload.payeeFspFee;
		quote.payeeFspCommission = message.payload.payeeFspCommission;
		quote.geoCode = message.payload.geoCode;
		quote.extensionList = message.payload.extensionList;
		quote.status = QuoteStatus.ACCEPTED;

		await this._quotesRepo.updateQuote(quote);
	}

	private async updateBulkQuoteStatus(bulkQuoteId: string, quotes: IQuote[], quotesNotProcessedIds: string[]) {
		if (quotesNotProcessedIds.length > 0) {
			const bulkQuote = await this._bulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

			if (bulkQuote) {
				bulkQuote.quotesNotProcessedIds = quotesNotProcessedIds;

				if (quotes.length === quotesNotProcessedIds.length) {
					bulkQuote.status = QuoteStatus.REJECTED;
				}

				await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
			}
		}
	}

	private async updateBulkQuoteInfo(message: BulkQuotePendingReceivedEvt, quotes: { quoteId: string; payee: { partyIdInfo: { partyIdType: string; partyIdentifier: string; partySubIdOrType: string | null; fspId: string | null; }; merchantClassificationCode: string | null; name: string | null; personalInfo: { complexName: { firstName: string | null; middleName: string | null; lastName: string | null; } | null; dateOfBirth: string | null; } | null; } | null; transferAmount: { currency: string; amount: string; } | null; payeeReceiveAmount: { currency: string; amount: string; } | null; payeeFspFee: { currency: string; amount: string; } | null; payeeFspCommission: { currency: string; amount: string; } | null; ilpPacket: string; condition: string; errorInformation: { errorCode: string; errorDescription: string; extensionList: { extension: { key: string; value: string; }[]; }; } | null; extensionList: { extension: { key: string; value: string; }[]; } | null; }[]) {
		const bulkQuoteId = message.payload.bulkQuoteId;
		const bulkQuote = await this._bulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

		if (!bulkQuote) {
			throw new BulkQuoteNotFoundError("BulkQuote not found for bulkQuoteId: " + bulkQuoteId);
		}

		// Update the status and fields of each quote that was processed/has new data
		for await (const individualQuote of quotes) {
			const quote = await this._quotesRepo.getQuoteById(individualQuote.quoteId);

			if (!quote) {
				throw new QuoteNotFoundError("Quote not found for quoteId: " + individualQuote.quoteId);
			}

			quote.requesterFspId = message.fspiopOpaqueState.requesterFspId;
			quote.destinationFspId = message.fspiopOpaqueState.destinationFspId;
			quote.quoteId = individualQuote.quoteId;
			quote.totalTransferAmount = individualQuote.transferAmount;
			quote.expiration = message.payload.expiration;
			quote.ilpPacket = individualQuote.ilpPacket;
			quote.condition = individualQuote.condition;
			quote.payeeReceiveAmount = individualQuote.payeeReceiveAmount;
			quote.payeeFspFee = individualQuote.payeeFspFee;
			quote.payeeFspCommission = individualQuote.payeeFspCommission;
			quote.extensionList = individualQuote.extensionList;
			quote.errorInformation = individualQuote.errorInformation;
			quote.status = QuoteStatus.ACCEPTED;

			await this._quotesRepo.updateQuote(quote);
		}

		const quotesProcessed = await this._quotesRepo.getQuotesByBulkQuoteIdAndStatus(bulkQuote.bulkQuoteId, QuoteStatus.ACCEPTED);

		const totalProcessedQuotes = quotesProcessed.length + bulkQuote.quotesNotProcessedIds.length;

		if (bulkQuote.individualQuotes.length === totalProcessedQuotes) {
			bulkQuote.status = QuoteStatus.ACCEPTED;
		}

		await this._bulkQuotesRepo.updateBulkQuote(bulkQuote);
	}

	//#endregion

	//#region Account Lookup Service
	private async getMissingFspId(payeePartyId: string | null, payeePartyIdType: string | null, currency: string | null) {
		if (!payeePartyId || !payeePartyIdType) {
			throw new InvalidDestinationPartyInformationError("No payeePartyId or payeePartyIdType passed to getMissingFspId");
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

	private async getMissingFspIds(quotes: IQuote[]): Promise<{[key:string]:string|null}| null> {
		const destinationFspIdsToDiscover: AccountLookupBulkQuoteFspIdRequest= {};
		for (const quote of quotes) {
			const destinationFspId = quote.payee?.partyIdInfo?.fspId;
			if(!destinationFspId) {
				const key = quote.quoteId;
				destinationFspIdsToDiscover[key] = {
					partyId: quote.payee?.partyIdInfo?.partyIdentifier,
					partyType: quote.payee?.partyIdInfo?.partyIdType,
					currency: quote.amount?.currency,
				};
			}
		}

		try{
			this._logger.debug(`No destinationFspId found in message, trying to get it from account lookup service for payee: ${JSON.stringify(destinationFspIdsToDiscover)}`);
			const destinationFspIds = await this._accountLookupService.getBulkAccountLookup(destinationFspIdsToDiscover);
			this._logger.debug(`Got destinationFspId from account lookup service: ${JSON.stringify(destinationFspIds)}`);
			return destinationFspIds;
		}
		catch(error:unknown){
			this._logger.error(`Unable to get destinationFspId from account lookup service for payee: ${JSON.stringify(destinationFspIdsToDiscover)} - ${error instanceof Error ? error.message : "Unexpected Error"}`);
			return null;
		}
	}
	//#endregion

	//#region Validations
	private validateMessageOrGetErrorEvent(message:IMessage): {errorEvent:QuoteErrorEvent | null, valid: boolean} {
		let errorEvent!: QuoteErrorEvent | null;
		const result = {errorEvent, valid: false};
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const quoteId = message.payload?.quoteId;
		const bulkQuoteId = message.payload?.bulkQuoteId;

		if(!message.payload){
			const errorMessage = "Message payload is null or undefined";
			this._logger.error(errorMessage);
			result.errorEvent = createInvalidMessagePayloadErrorEvent(errorMessage,requesterFspId,quoteId,bulkQuoteId);
			return result;
		}

		if(!message.msgName){
			const errorMessage = "Message name is null or undefined";
			this._logger.error(errorMessage);
			//TODO : create invalid message name error event
			result.errorEvent = createInvalidMessageNameErrorEvent(errorMessage,requesterFspId,quoteId,bulkQuoteId);
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
		let participant: IParticipant | null = null;
		let errorEvent!: QuoteErrorEvent | null;
		const result = { errorEvent, valid: false };

		if(!participantId){
			const errorMessage = `${(isDestinationParticipant)?"Destination":"Requester"} fspId is null or undefined`;
			this._logger.error(errorMessage);
			errorEvent = createInvalidParticipantIdErrorEvent(errorMessage, participantId, quoteId, bulkQuoteId);
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
