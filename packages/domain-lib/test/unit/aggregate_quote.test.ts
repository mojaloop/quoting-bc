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

import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { QuoteQueryReceivedEvt, QuoteQueryReceivedEvtPayload, QuoteQueryResponseEvtPayload, QuoteRequestAcceptedEvtPayload, QuoteRequestReceivedEvt, QuoteRequestReceivedEvtPayload, QuoteResponseAcceptedEvtPayload, QuoteResponseReceivedEvt, QuoteResponseReceivedEvtPayload} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {IMoney, IQuote, QuoteStatus} from '../../src/types';
import { createMessage, createQuoteRequestReceivedEvtPayload, createQuoteResponseReceivedEvtPayload } from "../utils/helpers";
import { quoteRepo, messageProducer, participantService, accountLookupService, logger, bulkQuoteRepo, schemaRules } from "../utils/mocked_variables";
import { mockedQuote1, mockedQuote2, mockedQuote4 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../src/aggregate";


let aggregate: QuotingAggregate;

describe("Domain - Unit Tests for Quote Events", () => {

    beforeAll(async () => {
        aggregate = new QuotingAggregate(logger,quoteRepo,bulkQuoteRepo,messageProducer,participantService,accountLookupService, false, schemaRules);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    //#region handleQuoteRequestReceivedEvt

    // test("handleQuoteRequestReceivedEvt - should publish error message if participant is invalid", async () => {
    //     const mockedQuote = mockedQuote1;
    //     const payload: QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

    //     const requesterFspId = "payer";
    //     const destinationFspId = "payee";
    //     const fspiopOpaqueState = {
    //         requesterFspId,
    //         destinationFspId,
    //     };

    //     const message: IMessage = createMessage(payload, QuoteRequestReceivedEvt.name,fspiopOpaqueState);

    //     const errorMsg = InvalidParticipantIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		destinationFspId,
    //         requesterFspId,
    //         quoteId: payload.quoteId,
    //         sourceEvent : QuoteRequestReceivedEvt.name,
	// 	};

    //     jest.spyOn(participantService, "getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "not matching", type: "DFSP", isActive: false} as IParticipant);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    test("handleQuoteRequestReceivedEvt - should call getAccountLookup if fspId not provided", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        payload.payee.partyIdInfo.fspId = null;

        const requesterFspId = "payer";
        const fspiopOpaqueState = {
            requesterFspId,
        };

        const message: IMessage = createMessage(payload, QuoteRequestReceivedEvt.name,fspiopOpaqueState);

        const accountLookupServiceSpy = jest.spyOn(accountLookupService, "getAccountLookup")
            .mockResolvedValueOnce("payee");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: mockedQuote.payer.partyIdInfo.fspId, type: "DFSP", isActive: true, approved: true } as IParticipant)
            .mockResolvedValueOnce({ id: mockedQuote.payee.partyIdInfo.fspId, type: "DFSP", isActive: true, approved: true } as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(accountLookupServiceSpy).toHaveBeenCalled();

    });

    // test("handleQuoteRequestReceivedEvt - should add quote to quote repo", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

    //     payload.payee.partyIdInfo.fspId = null;

    //     const requesterFspId = "payer";
    //     const destinationFspId = "payee";
    //     const fspiopOpaqueState = {
    //         requesterFspId,
    //         destinationFspId,
    //     };

    //     const message: IMessage = createMessage(payload, QuoteRequestReceivedEvt.name,fspiopOpaqueState);

    //     jest.spyOn(participantService, "getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(quoteRepo, "addQuote")
    //         .mockResolvedValueOnce(mockedQuote.quoteId);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(quoteRepo.addQuote).toHaveBeenCalled();
    //     expect(quoteRepo.addQuote).toHaveBeenCalledWith(expect.objectContaining({
    //         quoteId: mockedQuote.quoteId,
    //         status: QuoteStatus.PENDING,
    //     }));

    // });

    // test("handleQuoteRequestReceivedEvt - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

    //     const requesterFspId = "payer";
    //     const destinationFspId = "payee";
    //     const fspiopOpaqueState = {
    //         requesterFspId,
    //         destinationFspId,
    //     };

    //     const message: IMessage = createMessage(payload, QuoteRequestReceivedEvt.name,fspiopOpaqueState);

    //     const responsePayload : QuoteRequestAcceptedEvtPayload= {
    //         quoteId: mockedQuote.quoteId,
	// 		transactionId: mockedQuote.transactionId,
	// 		transactionRequestId: mockedQuote.transactionRequestId,
	// 		payee: mockedQuote.payee,
	// 		payer: mockedQuote.payer,
	// 		amountType: mockedQuote.amountType,
	// 		amount: mockedQuote.amount,
	// 		fees:mockedQuote.feesPayer ,
	// 		transactionType: mockedQuote.transactionType,
	// 		geoCode: mockedQuote.geoCode,
	// 		note: mockedQuote.note,
	// 		expiration: mockedQuote.expiration,
	// 		extensionList: mockedQuote.extensionList
    //     };

    //     jest.spyOn(quoteRepo, "addQuote")
    //         .mockResolvedValueOnce("inserted quote id");

    //     jest.spyOn(participantService, "getParticipantInfo")
    //         .mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: destinationFspId, type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": responsePayload,
    //     }));

    // });

    //#endregion


    //#region handleQuoteResponseReceivedEvt

    // test("handleQuoteResponseReceivedEvt - should send error event if requesterFspId not valid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name, null);

    //     const errorMsg = InvalidRequesterFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		requesterFspId:null,
    //         destinationFspId: null,
    //         quoteId: payload.quoteId,
    //         sourceEvent : QuoteResponseReceivedEvt.name,
	// 	};

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleQuoteResponseReceivedEvt - should send error event if destinationFspId not valid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;

    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //     };
    //     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

    //     const errorMsg = InvalidDestinationFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		requesterFspId:"payer",
    //         destinationFspId: null,
    //         quoteId: payload.quoteId,
    //         sourceEvent : QuoteResponseReceivedEvt.name,
	// 	};

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleQuoteResponseReceivedEvt - should send error event if couldnt validate requester participant", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     };
    //     const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

    //     const errorMsg = NoSuchParticipantError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:"payer",
    //         destinationFspId: "payee",
    //         quoteId: payload.quoteId,
    //         sourceEvent : QuoteResponseReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValue(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);


    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleQuoteResponseReceivedEvt - should send error event if couldnt find quote on database", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     }
    //     const message: IMessage = createMessage(payload,QuoteResponseReceivedEvt.name, fspiopOpaqueState);

    //     const errorMsg = NoSuchQuoteError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         errorMsg,
    //         requesterFspId:"payer",
    //         destinationFspId: "payee",
    //         quoteId: payload.quoteId,
    //         sourceEvent : QuoteResponseReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(quoteRepo, "getQuoteById")
    //         .mockResolvedValueOnce(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));

    // });

    // test("handleQuoteResponseReceivedEvt - should update quote on quote repository", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     }
    //     const message: IMessage = createMessage(payload,QuoteResponseReceivedEvt.name, fspiopOpaqueState);

    //     const repositorySpy = jest.spyOn(quoteRepo, "updateQuote");

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(quoteRepo, "getQuoteById")
    //         .mockResolvedValueOnce(mockedQuote2);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(repositorySpy).toHaveBeenCalledWith(expect.objectContaining({
    //         "expiration": mockedQuote2.expiration,
    //         "geoCode": mockedQuote2.geoCode,
    //         "quoteId": mockedQuote.quoteId,
    //         "status": QuoteStatus.ACCEPTED
    //     }));
    // });

    // test("handleQuoteResponseReceivedEvt - should send quote response accepted event", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;
    //     const payload:QuoteResponseReceivedEvtPayload = createQuoteResponseReceivedEvtPayload(mockedQuote);

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     }

    //     const message: IMessage = createMessage(payload,QuoteResponseReceivedEvt.name, fspiopOpaqueState);

    //     const quoteResponsePayload: QuoteResponseAcceptedEvtPayload = {
    //         expiration: mockedQuote.expiration as string ,
    //         geoCode: mockedQuote.geoCode,
    //         quoteId: mockedQuote.quoteId,
    //         extensionList: mockedQuote.extensionList,
    //         condition: mockedQuote.condition as string,
    //         ilpPacket: mockedQuote.ilpPacket as string,
    //         transferAmount: mockedQuote.totalTransferAmount as IMoney,
    //         payeeFspCommission: mockedQuote.payeeFspCommission as IMoney,
    //         payeeFspFee: mockedQuote.payeeFspFee as IMoney,
    //         payeeReceiveAmount: mockedQuote.payeeReceiveAmount as IMoney,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(quoteRepo, "getQuoteById")
    //         .mockResolvedValueOnce({} as unknown as IQuote);

    //     jest.spyOn(quoteRepo, "updateQuote")
    //         .mockResolvedValue();

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "fspiopOpaqueState": fspiopOpaqueState,
    //         "payload": quoteResponsePayload,
    //     }));

    // });
    //#endregion

    //#region handleQuoteQueryReceivedEvt

    // test("handleQuoteQueryReceivedEvt - should send error event if requesterFspId not valid", async () => {
    //     // Arrange
    //     const payload: QuoteQueryReceivedEvtPayload = {
    //         quoteId: "quoteId",
    //     };

    //     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, {});

    //     const errorMsg = InvalidRequesterFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         destinationFspId: null,
    //         errorMsg,
    //         quoteId: "quoteId",
    //         requesterFspId: null,
    //         sourceEvent: QuoteQueryReceivedEvt.name,
    //     };

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));
    // });

    // test("handleQuoteQueryReceivedEvt - should send error event if destinationFspId not valid", async () => {
    //     // Arrange
    //     const payload: QuoteQueryReceivedEvtPayload = {
    //         quoteId: "quoteId",
    //     };

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //     };

    //     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

    //     const errorMsg = InvalidDestinationFspIdError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         destinationFspId: null,
    //         errorMsg,
    //         quoteId: "quoteId",
    //         requesterFspId: "payer",
    //         sourceEvent: QuoteQueryReceivedEvt.name,
    //     };

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));
    // });

    // test("handleQuoteQueryReceivedEvt - should send error event if participant for requesterFspId not valid", async () => {
    //     // Arrange
    //     const payload: QuoteQueryReceivedEvtPayload = {
    //         quoteId: "quoteId",
    //     };

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     };

    //     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

    //     const errorMsg = NoSuchParticipantError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         destinationFspId: "payee",
    //         errorMsg,
    //         quoteId: "quoteId",
    //         requesterFspId: "payer",
    //         sourceEvent: QuoteQueryReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));
    // });

    // test("handleQuoteQueryReceivedEvt - should send error event if couldnt find the quote asked", async () => {
    //     // Arrange
    //     const payload: QuoteQueryReceivedEvtPayload = {
    //         quoteId: "quoteId",
    //     };

    //     const fspiopOpaqueState = {
    //         requesterFspId: "payer",
    //         destinationFspId: "payee",
    //     };

    //     const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

    //     const errorMsg = NoSuchQuoteError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
    //         destinationFspId: "payee",
    //         errorMsg,
    //         quoteId: "quoteId",
    //         requesterFspId: "payer",
    //         sourceEvent: QuoteQueryReceivedEvt.name,
    //     };

    //     jest.spyOn(participantService,"getParticipantInfo")
    //         .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
    //         .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

    //     jest.spyOn(quoteRepo, "getQuoteById")
    //         .mockResolvedValueOnce(null);

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //     }));
    // });

    test("handleQuoteQueryReceivedEvt - should respond with a successful event for the asked quote", async () => {
        // Arrange
        const payload: QuoteQueryReceivedEvtPayload = {
            quoteId: mockedQuote4.quoteId,
        };

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        };

        const message: IMessage = createMessage(payload,QuoteQueryReceivedEvt.name, fspiopOpaqueState);

        const payloadResponse: QuoteQueryResponseEvtPayload = {
            quoteId: mockedQuote4.quoteId,
            condition: mockedQuote4.condition as string,
            expiration: mockedQuote4.expiration as string,
            transferAmount: mockedQuote4.totalTransferAmount as IMoney,
            extensionList: mockedQuote4.extensionList,
            geoCode: mockedQuote4.geoCode,
            ilpPacket: mockedQuote4.ilpPacket as string,
            payeeFspCommission: mockedQuote4.payeeFspCommission,
            payeeFspFee: mockedQuote4.payeeFspFee,
            payeeReceiveAmount: mockedQuote4.payeeReceiveAmount
        };

        jest.spyOn(participantService,"getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true, approved: true } as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true, approved: true } as IParticipant);

        jest.spyOn(quoteRepo, "getQuoteById")
            .mockResolvedValueOnce(mockedQuote4);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
            "payload": payloadResponse,
        }));

    });

    //#endregion

});



