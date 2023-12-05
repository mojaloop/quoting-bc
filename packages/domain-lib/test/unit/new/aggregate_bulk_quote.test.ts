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
    BulkQuoteAcceptedEvt,
    BulkQuoteAcceptedEvtPayload,
    BulkQuotePendingReceivedEvt,
    BulkQuotePendingReceivedEvtPayload,
    BulkQuoteQueryReceivedEvt,
    BulkQuoteQueryResponseEvt,
    BulkQuoteQueryResponseEvtPayload,
    BulkQuoteReceivedEvt,
    BulkQuoteReceivedEvtPayload,
    BulkQuoteRequestedEvt,
    BulkQuoteRequestedEvtPayload,
    GetBulkQuoteQueryRejectedEvt,
    GetBulkQuoteQueryRejectedEvtPayload,
    GetBulkQuoteQueryRejectedResponseEvt,
    GetBulkQuoteQueryRejectedResponseEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { QuoteStatus } from "../../../src/types";
import {
    createBulkQuotePendingReceivedEvtPayload,
    createBulkQuoteRequestedEvtPayload,
    createMessage,
} from "../../utils/helpers";
import {
    logger,
    quoteRepo,
    bulkQuoteRepo,
    messageProducer,
    participantService,
    accountLookupService,
    schemaRules,
} from "../../utils/mocked_variables";
import {
    mockedBulkQuote1,
    mockedQuote1,
    mockedQuote2,
} from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../../src/aggregate";

let aggregate: QuotingAggregate;

describe("Domain - Unit Tests for Bulk Quote Events", () => {
    beforeAll(async () => {
        aggregate = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("Aggregate should be correctly instantiated", async () => {
        expect(aggregate).toBeTruthy();
    });

    // #region handleBulkQuoteRequestedEvt

    it("handleBulkQuoteRequestedEvt - should call getAccountLookup if destination fspId not provided", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = "payer";
        const fspiopOpaqueState = {
            requesterFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const accountLookupServiceSpy = jest
            .spyOn(accountLookupService, "getAccountLookup")
            .mockResolvedValueOnce("mockedDestinationFspId");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: "mockedDestinationFspId",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(accountLookupServiceSpy).toHaveBeenCalled();
    });

    it("handleBulkQuoteRequestedEvt - should add bulkQuote to bulkQuote repo without passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: "payer",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: "payee",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockResolvedValueOnce(
            mockedQuote.bulkQuoteId
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepo.addBulkQuote).toHaveBeenCalled();
        expect(bulkQuoteRepo.addBulkQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                bulkQuoteId: mockedQuote.bulkQuoteId,
                status: QuoteStatus.PENDING,
            })
        );
    });

    it("handleBulkQuoteRequestedEvt - should not add bulkQuote to bulkQuote repo with passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: "payer",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: "payee",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockResolvedValueOnce(
            mockedQuote.bulkQuoteId
        );

        jest.spyOn(messageProducer, "send");

        const aggregateWithPassThrough = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            true,
            schemaRules
        );

        // Act
        await aggregateWithPassThrough.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepo.addBulkQuote).toHaveBeenCalledTimes(0);
    });

    it("handleBulkQuoteRequestedEvt - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: BulkQuoteReceivedEvtPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            payer: mockedBulkQuote.payer,
            geoCode: mockedBulkQuote.geoCode,
            expiration: mockedBulkQuote.expiration,
            individualQuotes: mockedBulkQuote.individualQuotes as any,
            extensionList: mockedBulkQuote.extensionList,
        } as any;

        jest.spyOn(
            accountLookupService,
            "getAccountLookup"
        ).mockResolvedValueOnce("payee");

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockResolvedValueOnce(
            mockedBulkQuote.bulkQuoteId
        );

        jest.spyOn(quoteRepo, "addQuote").mockResolvedValueOnce(
            "inserted quote id"
        );

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: destinationFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);
        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: BulkQuoteReceivedEvt.name,
            })
        );
    });

    //#endregion

    //#region handleBulkQuotePendingReceivedEvt
    it("handleBulkQuotePendingReceivedEvt - should update bulk quote on bulk quote repository", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId: "payer",
            destinationFspId: "payee",
        };
        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const bulkQuoteRepositorySpy = jest.spyOn(
            bulkQuoteRepo,
            "updateBulkQuote"
        );

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: "payer",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: "payee",
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            mockedBulkQuote1
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue([
            mockedQuote1,
            mockedQuote2,
        ]);

        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValue();

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote");

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(bulkQuoteRepositorySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                expiration: mockedQuote.expiration,
                geoCode: mockedQuote.geoCode,
                bulkQuoteId: mockedQuote.bulkQuoteId,
                individualQuotes: mockedQuote.individualQuotes,
                extensionList: mockedQuote.extensionList,
                quotesNotProcessedIds: ["3", "4"],
                status: QuoteStatus.ACCEPTED,
            })
        );
    });

    it("handleBulkQuotePendingReceivedEvt - should update quotes that belong to bulkQuote on quotes repository", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote);
        const requesterFspId = "payer";
        const destinationFspId = "payee";

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };
        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: destinationFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            mockedBulkQuote1
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue([
            mockedQuote1,
            mockedQuote2,
        ]);

        const quoteRepositorySpy = jest
            .spyOn(quoteRepo, "updateQuotes")
            .mockResolvedValue();

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote");

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(quoteRepositorySpy).toHaveBeenCalledWith([
            expect.objectContaining({
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId,
                status: QuoteStatus.ACCEPTED,
            }),
            expect.objectContaining({
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId,
                status: QuoteStatus.ACCEPTED,
            }),
        ]);
    });

    it("handleBulkQuotePendingReceivedEvt - should send quote response accepted event", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote);
        const requesterFspId = "payer";
        const destinationFspId = "payee";

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const quoteResponsePayload: BulkQuoteAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string,
            bulkQuoteId: mockedQuote.bulkQuoteId,
            individualQuoteResults: mockedQuote.individualQuotes as any,
            extensionList: mockedQuote.extensionList,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: destinationFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            mockedBulkQuote1
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue([]);

        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValue();

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                fspiopOpaqueState,
                payload: quoteResponsePayload,
                msgName: BulkQuoteAcceptedEvt.name,
            })
        );
    });
    //#endregion

    //#region handleGetBulkQuoteQueryReceived
    it("handleGetBulkQuoteQueryReceived - should send bulk quote response event if bulk quote exists", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        };

        const requesterFspId = "payer";
        const destinationFspId = "payee";

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce({
            ...mockedBulkQuote,
            individualQuotes: [],
        });
        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue([
            mockedQuote1,
            mockedQuote2,
        ]);

        const responsePayload: BulkQuoteQueryResponseEvtPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            individualQuoteResults: [mockedQuote1, mockedQuote2],
            expiration: mockedBulkQuote.expiration,
            extensionList: mockedBulkQuote.extensionList,
        } as any;

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: destinationFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: BulkQuoteQueryResponseEvt.name,
                fspiopOpaqueState,
            })
        );
    });
    //#endregion

    //#region handleGetBulkQuoteQueryRejected
    it("handleGetBulkQuoteQueryRejected - it should publish bulk quote with error information", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload: GetBulkQuoteQueryRejectedEvtPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Bulk quote error",
                extensionList: null,
            },
        };

        const requesterFspId = "payer";
        const destinationFspId = "payee";

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            GetBulkQuoteQueryRejectedEvt.name,
            fspiopOpaqueState
        );

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            null
        );

        //TODO: add extension list to GetBulkQuoteQueryRejectedResponseEvtPayload
        const responsePayload = {
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Bulk quote error",
                extensionList: null,
            },
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: destinationFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: GetBulkQuoteQueryRejectedResponseEvt.name,
                fspiopOpaqueState,
            })
        );
    });

    //#endregion
});
