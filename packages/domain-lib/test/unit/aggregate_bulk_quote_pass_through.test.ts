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
import {
    BulkQuoteAcceptedEvtPayload, 
    BulkQuotePendingReceivedEvt,
    BulkQuotePendingReceivedEvtPayload,
    BulkQuoteReceivedEvtPayload,
    BulkQuoteRequestedEvt,
    BulkQuoteRequestedEvtPayload,
    QuoteErrorEvtPayload
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { 
    InvalidParticipantIdError,
    InvalidRequesterFspIdError,
    NoSuchParticipantError,
    InvalidDestinationFspIdError} from "../../src/errors";
import { createBulkQuotePendingReceivedEvtPayload, createBulkQuoteRequestedEvtPayload, createMessage } from "../utils/helpers";
import { logger, quoteRepo, bulkQuoteRepo, messageProducer, participantService, accountLookupService } from "../utils/mocked_variables";
import { mockedBulkQuote1, mockedQuote2 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../src/aggregate";

let aggregate: QuotingAggregate;


describe("Domain - Unit Tests for Bulk Quote Events with Passthrough Mode", () => {

    beforeAll(async () => {
        aggregate = new QuotingAggregate(logger,quoteRepo,bulkQuoteRepo,messageProducer,participantService,accountLookupService, true);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });


    // #region handleBulkQuoteRequestedEvt

    test("handleBulkQuoteRequestedEvt - should publish error message if participant is invalid", async () => {
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload = createBulkQuoteRequestedEvtPayload(mockedQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(payload, BulkQuoteRequestedEvt.name,fspiopOpaqueState);

        const errorMsg = InvalidParticipantIdError.name;

        const errorPayload: QuoteErrorEvtPayload = {
			errorMsg,
			destinationFspId,
            requesterFspId,
            quoteId: payload.bulkQuoteId,
            sourceEvent : BulkQuoteRequestedEvt.name,
		};



        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: "not matching", type: "DFSP", isActive: false} as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleBulkQuoteRequestedEvt - should call getAccountLookup if fspId not provided", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload = createBulkQuoteRequestedEvtPayload(mockedQuote);

        payload.payer.partyIdInfo.fspId = null;

        const requesterFspId = "payer";
        const fspiopOpaqueState = {
            requesterFspId,
        };

        const message: IMessage = createMessage(payload, BulkQuoteRequestedEvt.name,fspiopOpaqueState);

        const accountLookupServiceSpy = jest.spyOn(accountLookupService, "getBulkAccountLookup")
            .mockResolvedValueOnce({ test: "payee" });

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(accountLookupServiceSpy).toHaveBeenCalled();

    });

    test("handleBulkQuoteRequestedEvt - should skip adding bulkQuote to the bulkQuote repo", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuoteRequestedEvtPayload = createBulkQuoteRequestedEvtPayload(mockedQuote);

        payload.payer.partyIdInfo.fspId = null;

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(payload, BulkQuoteRequestedEvt.name,fspiopOpaqueState);

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(bulkQuoteRepo, "addBulkQuote");

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepo.addBulkQuote).toHaveBeenCalledTimes(0);

    });

    test("handleBulkQuoteRequestedEvt - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload:BulkQuoteRequestedEvtPayload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(payload, BulkQuoteRequestedEvt.name,fspiopOpaqueState);

        const responsePayload : BulkQuoteReceivedEvtPayload= {
            "bulkQuoteId": mockedBulkQuote.bulkQuoteId,
            "payer": mockedBulkQuote.payer,
            "geoCode": mockedBulkQuote.geoCode,
            "expiration": mockedBulkQuote.expiration,
            "individualQuotes": mockedBulkQuote.individualQuotes as any,
            extensionList: mockedBulkQuote.extensionList
        } as any;

        jest.spyOn(accountLookupService, "getBulkAccountLookup")
            .mockResolvedValueOnce({
                "2243fdbe-5dea-3abd-a210-3780e7f2f1f4": "payee",
                "1243fdbe-5dea-3abd-a210-3780e7f2f1f4": "payee"
            });

        jest.spyOn(bulkQuoteRepo, "addBulkQuote")
            .mockResolvedValueOnce(mockedBulkQuote.bulkQuoteId);

        jest.spyOn(quoteRepo, "addQuote")
            .mockResolvedValueOnce("inserted quote id");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: destinationFspId, type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValue({ id: destinationFspId, type: "DFSP", isActive: true} as IParticipant);


        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    //#endregion


    // #region handleBulkQuotePendingReceivedEvt

    test("handleBulkQuotePendingReceivedEvt - should send error event if requesterFspId not valid", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name, null);

        const errorMsg = InvalidRequesterFspIdError.name;

        const errorPayload: QuoteErrorEvtPayload = {
            errorMsg,
            requesterFspId:null,
            destinationFspId: null,
            quoteId: payload.bulkQuoteId,
            sourceEvent : BulkQuotePendingReceivedEvt.name,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleBulkQuotePendingReceivedEvt - should send error event if destinationFspId not valid", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;

        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
        };
        const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name,fspiopOpaqueState);

        const errorMsg = InvalidDestinationFspIdError.name;

        const errorPayload: QuoteErrorEvtPayload = {
            errorMsg,
            requesterFspId:"payer",
            destinationFspId: null,
            quoteId: payload.bulkQuoteId,
            sourceEvent : BulkQuotePendingReceivedEvt.name,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleBulkQuotePendingReceivedEvt - should send error event if couldnt validate requester participant", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        };
        const message: IMessage = createMessage(payload, BulkQuotePendingReceivedEvt.name,fspiopOpaqueState);

        const errorMsg = NoSuchParticipantError.name;

        const errorPayload: QuoteErrorEvtPayload = {
            errorMsg,
            requesterFspId:"payer",
            destinationFspId: "payee",
            quoteId: payload.bulkQuoteId,
            sourceEvent : BulkQuotePendingReceivedEvt.name,
        };

        jest.spyOn(participantService,"getParticipantInfo")
            .mockResolvedValue(null);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);


        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleBulkQuotePendingReceivedEvt - shouldn't send error event due to skipping finding bulkQuote on the database", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        }
        const message: IMessage = createMessage(payload,BulkQuotePendingReceivedEvt.name, fspiopOpaqueState);

        const quoteResponsePayload: BulkQuoteAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string ,
            bulkQuoteId: mockedQuote.bulkQuoteId,
            individualQuoteResults: mockedQuote.individualQuotes as any,
            extensionList: mockedQuote.extensionList,
        };

        jest.spyOn(participantService,"getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById");

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepo.getBulkQuoteById).toHaveBeenCalledTimes(0);
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
            "payload": quoteResponsePayload,
        }));

    });

    test("handleBulkQuotePendingReceivedEvt - shouldn't update bulkQuote on bulkQuote repository due to skipping", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        }
        const message: IMessage = createMessage(payload,BulkQuotePendingReceivedEvt.name, fspiopOpaqueState);

        const quoteResponsePayload: BulkQuoteAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string ,
            bulkQuoteId: mockedQuote.bulkQuoteId,
            individualQuoteResults: mockedQuote.individualQuotes as any,
            extensionList: mockedQuote.extensionList,
        };

        jest.spyOn(participantService,"getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById")
            .mockResolvedValueOnce(mockedBulkQuote1);

        jest.spyOn(quoteRepo, "getQuoteById")
            .mockResolvedValue(mockedQuote2);

        jest.spyOn(quoteRepo, "updateQuote")
            .mockResolvedValue();

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote")

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepo.getBulkQuoteById).toHaveBeenCalledTimes(0);
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledTimes(0);
        expect(quoteRepo.getQuoteById).toHaveBeenCalledTimes(0);
        expect(quoteRepo.updateQuote).toHaveBeenCalledTimes(0);
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
            "payload": quoteResponsePayload,
        }));
    });

    test("handleBulkQuotePendingReceivedEvt - should send quote response accepted event", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload:BulkQuotePendingReceivedEvtPayload = createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        }

        const message: IMessage = createMessage(payload,BulkQuotePendingReceivedEvt.name, fspiopOpaqueState);

        const quoteResponsePayload: BulkQuoteAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string ,
            bulkQuoteId: mockedQuote.bulkQuoteId,
            individualQuoteResults: mockedQuote.individualQuotes as any,
            extensionList: mockedQuote.extensionList,
        };

        jest.spyOn(participantService,"getParticipantInfo")
            .mockResolvedValueOnce({ id: "payer", type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: "payee", type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById")
            .mockResolvedValueOnce(mockedBulkQuote1);

        jest.spyOn(quoteRepo, "getQuoteById")
            .mockResolvedValue(mockedQuote2);

        jest.spyOn(quoteRepo, "updateQuote")
            .mockResolvedValue();

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote")
            .mockResolvedValue();

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
            "payload": quoteResponsePayload,
        }));

    });
    //#endregion
});
