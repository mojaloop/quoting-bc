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
import { IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
	InvalidMessagePayloadError,
	InvalidMessageTypeError,
	UnableToProcessMessageError,
	NoSuchParticipantError,
	InvalidParticipantIdError,
	RequiredParticipantIsNotActive,
	NoSuchQuoteError,
	InvalidRequesterFspIdError,
	InvalidDestinationFspIdError
} from "./errors";
import { IAccountLookupService, IParticipantService, IQuoteRepo} from "./interfaces/infrastructure";
import {
	QuoteErrorEvt,
	QuoteErrorEvtPayload,
	QuoteRequestReceivedEvt,
	QuoteRequestAcceptedEvt,
	QuoteRequestAcceptedEvtPayload,
	QuoteResponseReceivedEvt,
	QuoteResponseAccepted,
	QuoteResponseAcceptedEvtPayload,
	QuoteQueryReceivedEvt,
	QuoteQueryResponseEvt,
	QuoteQueryResponseEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IExtensionList, Quote, QuoteStatus } from "./types";

export class QuotingAggregate  {
	private readonly _logger: ILogger;
	private readonly _quotesRepo: IQuoteRepo;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	private readonly _accountLookupService: IAccountLookupService;

	constructor(
		logger: ILogger,
		quoteRegistry:IQuoteRepo,
		messageProducer:IMessageProducer,
		participantService: IParticipantService,
		accountLookupService: IAccountLookupService
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._quotesRepo = quoteRegistry;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
		this._accountLookupService = accountLookupService;
	}

	async handleQuotingEvent(message: IMessage): Promise<void> {
		try{
			const isMessageValid = this.validateMessage(message);
			if(isMessageValid) {
				await this.handleEvent(message);
			}
		} catch(error:any) {
			const errorMessage = error.constructor.name;
			this._logger.error(`Error processing event : ${message.msgName} -> ` + errorMessage);

			// TODO: find a way to publish the correct error event type

			const errorPayload: QuoteErrorEvtPayload = {
				errorMsg: errorMessage,
				quoteId: message.payload?.quoteId ?? "N/A",
				sourceEvent: message.msgName,
				requesterFspId: message.fspiopOpaqueState?.requesterFspId ?? "N/A",
				destinationFspId: message.fspiopOpaqueState?.destinationFspId ?? "N/A",

			};
			const messageToPublish = new QuoteErrorEvt(errorPayload);
			messageToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
			await this._messageProducer.send(messageToPublish);
		}
	}
	

	private validateMessage(message:IMessage): boolean {
		if(!message.payload){
			this._logger.error(`QuoteEventHandler: message payload has invalid format or value`);
			throw new InvalidMessagePayloadError();
		}

		if(!message.msgName){
			this._logger.error(`QuoteEventHandler: message name is invalid`);
			throw new InvalidMessageTypeError();
		}

		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			this._logger.error(`QuoteEventHandler: message type is invalid : ${message.msgType}`);
			throw new InvalidMessageTypeError();
		}

		return true;
	}

	private async handleEvent(message:IMessage):Promise<void> {
		
		let eventToPublish = null;
		
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
			default:
				this._logger.error(`message type has invalid format or value ${message.msgName}`);
				throw new InvalidMessageTypeError();
			}
		if(eventToPublish){
			await this._messageProducer.send(eventToPublish);
		}else{
			throw new UnableToProcessMessageError();
		}

	}

	private async handleQuoteRequestReceivedEvt(message: QuoteRequestReceivedEvt):Promise<QuoteRequestAcceptedEvt> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${message.payload.quoteId}`);
		
		await this.validateParticipant(message.fspiopOpaqueState.requesterFspId);

		let destinationFspIdToUse = message.fspiopOpaqueState.destinationFspId ?? message.payload.payee.partyIdInfo.fspId;

		if(!destinationFspIdToUse){
			this._logger.debug(`No destinationFspId found in message, trying to get it from account lookup service for payee: ${message.payload.payee.partyIdInfo.partyIdentifier}`);
			destinationFspIdToUse = await this._accountLookupService.getAccountFspId(message.payload.payee.partyIdInfo.partyIdentifier, message.payload.payee.partyIdInfo.partyIdType, message.payload.payee.partyIdInfo.partySubIdOrType, null);
			
			if(destinationFspIdToUse){
				this._logger.debug(`Got destinationFspId from account lookup service: ${destinationFspIdToUse}`);
			}
			else{
				this._logger.error(`Unable to get destinationFspId from account lookup service for payee: ${message.payload.payee.partyIdInfo.partyIdentifier}`);
			}
		}

		await this.validateParticipant(destinationFspIdToUse);

		const quote: Quote = {
			quoteId: message.payload.quoteId,
			requesterFspId: message.fspiopOpaqueState.requesterFspId,
            destinationFspId: message.fspiopOpaqueState.destinationFspId,
			transactionId: message.payload.transactionId,
			// TODO: correct in shared tip libs
			payee: message.payload.payee as any,
			payer: message.payload.payer as any,
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
		};

		await this._quotesRepo.addQuote(quote);

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

	private async handleQuoteResponseReceivedEvt(message: QuoteResponseReceivedEvt):Promise<QuoteResponseAccepted> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${message.payload.quoteId}`);
		
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		if(!requesterFspId){
			throw new InvalidRequesterFspIdError();
		}

		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		if(!destinationFspId){
			throw new InvalidDestinationFspIdError();
		}

		await this.validateParticipant(requesterFspId);
		await this.validateParticipant(destinationFspId);
		
		const quote = await this._quotesRepo.getQuoteById(message.payload.quoteId);

		if(!quote){
			throw new NoSuchQuoteError();
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

	private async handleQuoteQueryReceivedEvt(message: QuoteQueryReceivedEvt):Promise<QuoteQueryResponseEvt> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${message.payload.quoteId}`);
		
		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		if(!requesterFspId){
			throw new InvalidRequesterFspIdError();
		}

		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;

		if(!destinationFspId){
			throw new InvalidDestinationFspIdError();
		}

		await this.validateParticipant(requesterFspId);
		await this.validateParticipant(destinationFspId);
		
		const quote = await this._quotesRepo.getQuoteById(message.payload.quoteId);

		if(!quote) {
			throw new NoSuchQuoteError();
		}

		const payload: QuoteQueryResponseEvtPayload = { 
			quoteId: quote.quoteId,
			transferAmount: quote.totalTransferAmount!,
			expiration: quote.expiration!,
			ilpPacket: quote.ilpPacket!, 
			condition:	quote.condition!,
			payeeReceiveAmount: quote.amount,
			payeeFspFee: quote.payeeFspFee,
			extensionList: quote.extensionList as IExtensionList,
			geoCode: quote.geoCode!,
			payeeFspCommission:	quote.feesPayer!,
		};

		const event = new QuoteQueryResponseEvt(payload);

		event.fspiopOpaqueState = message.fspiopOpaqueState;

		return event;
	}
	
	private async validateParticipant(participantId: string | null):Promise<void>{
		if(participantId){
			const participant = await this._participantService.getParticipantInfo(participantId);

			if(!participant) {
				this._logger.debug(`No participant found`);
				throw new NoSuchParticipantError();
			}
		
			if(participant.id !== participantId){
				this._logger.debug(`Participant id mismatch ${participant.id} ${participantId}`);
				throw new InvalidParticipantIdError();
			}
		
			if(!participant.isActive) {
				this._logger.debug(`${participant.id} is not active`);
				throw new RequiredParticipantIsNotActive();
			}
		}

		return;
	}

}
