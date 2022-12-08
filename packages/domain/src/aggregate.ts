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
	NonExistingQuoteError
} from "./errors";
import { IAccountLookupService, IParticipantService, IQuoteRegistry} from "./interfaces/infrastructure";
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
	private readonly _quoteRegistry: IQuoteRegistry;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	private readonly _accountLookupService: IAccountLookupService;

	constructor(
		logger: ILogger,
		quoteRegistry:IQuoteRegistry,
		messageProducer:IMessageProducer,
		participantService: IParticipantService,
		accountLookupService: IAccountLookupService
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._quoteRegistry = quoteRegistry;
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
				requesterFspId: message.payload?.requesterFspId ?? "N/A",
				destinationFspId: message.payload?.destinationFspId ?? "N/A",

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

	private async handleQuoteRequestReceivedEvt(msg: QuoteRequestReceivedEvt):Promise<QuoteRequestAcceptedEvt> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${msg.payload.quoteId}`);
		
		await this.validateParticipant(msg.fspiopOpaqueState.requesterFspId);

		let destinationFspIdToUse = msg.fspiopOpaqueState.destinationFspId ?? msg.payload.payee.partyIdInfo.fspId;

		if(!destinationFspIdToUse){
			destinationFspIdToUse = await this._accountLookupService.getAccountFspId(msg.payload.payee.partyIdInfo.partyIdentifier, msg.payload.payee.partyIdInfo.partyIdType, msg.payload.payee.partyIdInfo.partySubIdOrType, null);
		}

		await this.validateParticipant(destinationFspIdToUse);

		const quote: Quote = {
			quoteId: msg.payload.quoteId,
			requesterFspId: msg.fspiopOpaqueState.requesterFspId,
            destinationFspId: msg.fspiopOpaqueState.destinationFspId,
			transactionId: msg.payload.transactionId,
			payee: msg.payload.payee,
			payer: msg.payload.payer,
			amountType: msg.payload.amountType,
			amount: msg.payload.amount,
			transactionType: msg.payload.transactionType,
			feesPayer: msg.payload.fees,
			transactionRequestId: msg.payload.transactionRequestId,
			geoCode: msg.payload.geoCode,
			note: msg.payload.note,
			expiration: msg.payload.expiration,
			extensionList: msg.payload.extensionList,
			payeeReceiveAmount: null,
			payeeFspFee: null,
			payeeFspCommission: null,
			status: QuoteStatus.PENDING,
			condition: null,
			transferAmount: null,
			ilpPacket: null,
		}

		await this._quoteRegistry.addQuote(quote);

		const payload : QuoteRequestAcceptedEvtPayload = {
			quoteId: msg.payload.quoteId,
			transactionId: msg.payload.transactionId,
			transactionRequestId: msg.payload.transactionRequestId,
			payee: msg.payload.payee,
			payer: msg.payload.payer,
			amountType: msg.payload.amountType,
			amount: msg.payload.amount,
			fees: msg.payload.fees,
			transactionType: msg.payload.transactionType,
			geoCode: msg.payload.geoCode,
			note: msg.payload.note,
			expiration: msg.payload.expiration,
			extensionList: msg.payload.extensionList
		};

		const event = new QuoteRequestAcceptedEvt(payload);

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;

	}

	private async handleQuoteResponseReceivedEvt(msg: QuoteResponseReceivedEvt):Promise<QuoteResponseAccepted> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${msg.payload.quoteId}`);
		
		await this.validateParticipant(msg.fspiopOpaqueState.requesterFspId);
		await this.validateParticipant(msg.fspiopOpaqueState.destinationFspId);
		
		const quote = await this._quoteRegistry.getQuoteById(msg.payload.quoteId);

		if(!quote){
			throw new NonExistingQuoteError();
		}

		quote.requesterFspId = msg.fspiopOpaqueState.requesterFspId;
		quote.destinationFspId = msg.fspiopOpaqueState.destinationFspId;
		quote.quoteId = msg.payload.quoteId;
		quote.transferAmount = msg.payload.transferAmount;
		quote.expiration = msg.payload.expiration;
		quote.ilpPacket = msg.payload.ilpPacket;
		quote.condition = msg.payload.condition;
		quote.payeeReceiveAmount = msg.payload.payeeReceiveAmount;
		quote.payeeFspFee = msg.payload.payeeFspFee;
		quote.payeeFspCommission = msg.payload.payeeFspCommission;
		quote.geoCode = msg.payload.geoCode;
		quote.extensionList = msg.payload.extensionList;
		quote.status = QuoteStatus.ACCEPTED;

		await this._quoteRegistry.updateQuote(quote);

		const payload : QuoteResponseAcceptedEvtPayload = {
            quoteId: msg.payload.quoteId,
            transferAmount: msg.payload.transferAmount,
            expiration: msg.payload.expiration,
            ilpPacket: msg.payload.ilpPacket,
            condition: msg.payload.condition,
            payeeReceiveAmount: msg.payload.payeeReceiveAmount,
            payeeFspFee: msg.payload.payeeFspFee,
            payeeFspCommission: msg.payload.payeeFspCommission,
            geoCode: msg.payload.geoCode,
            extensionList: msg.payload.extensionList
		};

		const event = new QuoteResponseAccepted(payload);

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;

	}

	private async handleQuoteQueryReceivedEvt(msg: QuoteQueryReceivedEvt):Promise<QuoteQueryResponseEvt> {
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${msg.payload.quoteId}`);
		
		await this.validateParticipant(msg.fspiopOpaqueState.requesterFspId);
		await this.validateParticipant(msg.fspiopOpaqueState.destinationFspId);
		
		const quote = await this._quoteRegistry.getQuoteById(msg.payload.quoteId);

		if(!quote) {
			throw new NonExistingQuoteError()
		}

		const payload: QuoteQueryResponseEvtPayload = { 
			quoteId: quote.quoteId,
			transferAmount: quote.amount,
			expiration: quote.expiration!,
			ilpPacket: quote.ilpPacket!, 
			condition:	quote.condition!,
			payeeReceiveAmount: quote.amount!,
			payeeFspFee: quote.feesPayer!,
			extensionList: quote.extensionList as IExtensionList,
			geoCode: quote.geoCode!,
			payeeFspCommission:	quote.feesPayer!,
		};

		const event = new QuoteQueryResponseEvt(payload);

		// carry over
		event.fspiopOpaqueState = msg.fspiopOpaqueState;

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
