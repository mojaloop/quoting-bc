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

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

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
	UnableToProcessMessageError
} from "./errors";
import { IParticipantService} from "./interfaces/infrastructure";
import {
	QuotingErrorEvt,
	QuotingErrorEvtPayload,
	QuotingRequestReceivedEvt,
	QuotingRequestCreatedCreatedEvt,
	QuotingRequestCreatedCreatedEvtPayload
	} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";

export class QuotingAggregate  {
	private readonly _logger: ILogger;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	

	constructor(
		logger: ILogger,
		messageProducer:IMessageProducer,
		participantService: IParticipantService
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._messageProducer = messageProducer;
		this._participantService = participantService;
	}

	async init(): Promise<void> {

	}

	async destroy(): Promise<void> {

	}


	async handleQuotingEvent(message: IMessage): Promise<void> {
		try{
				const isMessageValid = this.validateMessage(message);
				if(isMessageValid) {
					await this.handleEvent(message);
				}
			}
			catch(error:any) {
				const errorMessage = error.constructor.name;
				this._logger.error(`Error processing event : ${message.msgName} -> ` + errorMessage);

				// TODO: find a way to publish the correct error event type

				const errorPayload: QuotingErrorEvtPayload = {
					errorMsg: errorMessage,
					partyId: message.payload?.partyId ?? "N/A",
					sourceEvent: message.msgName,
					partyType: message.payload?.partyType ?? "N/A",
					partySubType: message.payload?.partySubType ?? "N/A",
					requesterFspId: message.payload?.requesterFspId ?? "N/A",

				};
				const messageToPublish = new QuotingErrorEvt(errorPayload);
				messageToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
				await this._messageProducer.send(messageToPublish);
			}
	}
	

	private validateMessage(message:IMessage): boolean {
		if(!message.payload){
			this._logger.error(`QuoteEventHandler: message payload has invalid format or value`);
			throw new InvalidMessagePayloadError();
		}
		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			this._logger.error(`QuoteEventHandler: message type is invalid : ${message.msgType}`);
			throw new InvalidMessageTypeError();
		}

		return true;
	}

	private async handleEvent(message:IMessage):Promise<void> {
		const {payload, fspiopOpaqueState} = message;
		let eventToPublish = null;
		switch(message.msgName){
			case QuotingRequestReceivedEvt.name:
				eventToPublish = await this.handleQuotingRequestReceivedEvt(message as QuotingRequestReceivedEvt);
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

	private async handleQuotingRequestReceivedEvt(msg: QuotingRequestReceivedEvt):Promise<QuotingRequestCreatedCreatedEvt>{
		this._logger.debug(`Got participantAssociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		await this.validateParticipant(msg.payload.ownerFspId);

		const payload : QuotingRequestCreatedCreatedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
		};

		const event = new QuotingRequestCreatedCreatedEvt(payload);

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;

	}

	private async validateParticipant(participantId: string | null):Promise<void>{
		// FIXME implement actual participantClient
		return;
		// if(participantId){
		// 	const participant = await this._participantService.getParticipantInfo(participantId);
		//
		// 	if(!participant) {
		// 		this._logger.debug(`No participant found`);
		// 		throw new NoSuchParticipantError();
		// 	}
		//
		// 	if(participant.id !== participantId){
		// 		this._logger.debug(`Participant id mismatch ${participant.id} ${participantId}`);
		// 		throw new InvalidParticipantIdError();
		// 	}
		//
		// 	if(!participant.isActive) {
		// 		this._logger.debug(`${participant.id} is not active`);
		// 		throw new RequiredParticipantIsNotActive();
		// 	}
		// }
	}

}
