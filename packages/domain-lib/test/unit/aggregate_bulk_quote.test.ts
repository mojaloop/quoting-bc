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

import { CommandMsg, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import {
    BulkQuoteAcceptedEvt,
    BulkQuoteAcceptedEvtPayload,
    BulkQuotePendingReceivedEvtPayload,
    BulkQuoteQueryResponseEvt,
    BulkQuoteQueryResponseEvtPayload,
    BulkQuoteReceivedEvt,
    BulkQuoteReceivedEvtPayload,
    BulkQuoteRequestedEvtPayload,
    BulkQuoteRejectedEvtPayload,
    BulkQuoteRejectedResponseEvt,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IQuote, QuoteState } from "@mojaloop/quoting-bc-public-types-lib";
import {
    createBulkQuotePendingReceivedEvtPayload,
    createBulkQuoteRequestedEvtPayload,
    createCommand,
} from "../utils/helpers";
import {
    logger,
    quoteRepo,
    bulkQuoteRepo,
    messageProducer,
    participantService,
    accountLookupService,
    currencyList,
} from "../utils/mocked_variables";
import {
    MemoryTracing,
    mockedBulkQuote1,
    mockedQuote1,
    mockedQuote2,
} from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../src/aggregate";
import { IMetrics, ITracing, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { QueryReceivedBulkQuoteCmd, RejectedBulkQuoteCmd, RequestReceivedBulkQuoteCmd, ResponseReceivedBulkQuoteCmd } from "../../src/commands";

let aggregate: QuotingAggregate;

const metricsMock: IMetrics = new MetricsMock();
const tracingMock: ITracing = new MemoryTracing();

const PASS_THROUGH_MODE = true;
const PASS_THROUGH_MODE_FALSE = false;

describe("Domain - Unit Tests for Bulk Quote Events", () => {
    beforeAll(async () => {
        aggregate = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            metricsMock,
            PASS_THROUGH_MODE_FALSE,
            currencyList,
            tracingMock
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

    test("handleBulkQuoteRequestedEvent - should call getAccountLookup if destination fspId not provided", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedBulkQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: null
            });


        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name,
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const accountLookupServiceSpy = jest
            .spyOn(accountLookupService, "getAccountLookup")
            .mockResolvedValueOnce("mockedDestinationFspId");

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote");

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
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(accountLookupServiceSpy).toHaveBeenCalled();
    });

    test("handleBulkQuoteRequestedEvent - should call getAccountLookup if destination fspId not provided only one time in the best case scenario", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedBulkQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: null
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };


        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
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

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(accountLookupServiceSpy).toHaveBeenCalledTimes(1);
    });


    test("handleBulkQuoteRequestedEvent - should add bulkQuote to bulkQuote repo without passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const payloadResponse =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {}, ["requesterFspId", "destinationFspId"]);

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

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValueOnce();

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalled();
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                msgName: BulkQuoteReceivedEvt.name,
                payload: payloadResponse
            })]
        );
    });

 
    test("handleBulkQuoteRequestedEvent - should add quotes to quote repo that belong to bulkQuote without passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const payloadResponse =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {}, ["requesterFspId", "destinationFspId"]);
            
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

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();
        
        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalled();
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                msgName: BulkQuoteReceivedEvt.name,
                payload: payloadResponse
            })]
        );
    });
   
    test("handleBulkQuoteRequestedEvent - should not add bulkQuote to bulkQuote repo with passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };


        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const payloadResponse =
            createBulkQuoteRequestedEvtPayload(mockedQuote, {}, ["requesterFspId", "destinationFspId"]);

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

        jest.spyOn(messageProducer, "send");

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValueOnce();
        
        const aggregateWithPassThrough = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            metricsMock,
            PASS_THROUGH_MODE,
            currencyList,
            tracingMock
        );

        // Act
        await aggregateWithPassThrough.processCommandBatch([command]);

        // Assert
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledTimes(0);
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                msgName: BulkQuoteReceivedEvt.name,
                payload: payloadResponse
            })]
        );
    });

    test("handleBulkQuoteRequestedEvent - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuoteRequestedEvtPayload =
            createBulkQuoteRequestedEvtPayload(mockedBulkQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            RequestReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const responsePayload: BulkQuoteReceivedEvtPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            payer: mockedBulkQuote.payer,
            geoCode: mockedBulkQuote.geoCode,
            expiration: mockedBulkQuote.expiration,
            individualQuotes: mockedBulkQuote.individualQuotes,
        };

        jest.spyOn(
            accountLookupService,
            "getAccountLookup"
        ).mockResolvedValueOnce("payee");

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

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: responsePayload,
                msgName: BulkQuoteReceivedEvt.name,
            })]
        );
    });

    //#endregion

    //#region handleBulkQuotePendingReceivedEvt
    test("handleBulkQuotePendingReceivedEvent - should update bulk quote on bulk quote repository", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };
        
        const command: CommandMsg = createCommand(
            payload, 
            ResponseReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        const payloadResponse =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote, {}, ["requesterFspId", "destinationFspId"]);
        
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

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockResolvedValueOnce(
            mockedQuote.bulkQuoteId
        );

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValueOnce();

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalled();
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                msgName: BulkQuoteAcceptedEvt.name,
                payload: payloadResponse
            })]
        );
    });
     
   
    test("handleBulkQuotePendingReceivedEvent - should update quotes that belong to bulkQuote on quotes repository", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };
        
        const command: CommandMsg = createCommand(
            payload, 
            ResponseReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
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

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            mockedBulkQuote1
        );

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            responseQuotes[0]
        );
        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            responseQuotes[1]
        );

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(messageProducer, "send");
        
        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        /*expect(quotesCache.set).toHaveBeenCalledWith(
            responseQuotes[0].quoteId,
            expect.objectContaining({
                status: QuoteState.ACCEPTED,
            }),
        );
        expect(quotesCache.set).toHaveBeenCalledWith(
            responseQuotes[1].quoteId,
            expect.objectContaining({
                status: QuoteState.ACCEPTED,
            }),
        );*/
        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                bulkQuoteId: mockedBulkQuote1.bulkQuoteId,
                status: QuoteState.ACCEPTED,
            }),
        );
    });


    test("handleBulkQuotePendingReceivedEvent - should send quote response accepted event", async () => {
        // Arrange
        const mockedQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuotePendingReceivedEvtPayload =
            createBulkQuotePendingReceivedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            ResponseReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );


        const quoteResponsePayload: BulkQuoteAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string,
            bulkQuoteId: mockedQuote.bulkQuoteId,
            individualQuoteResults: mockedQuote.individualQuotes as any,
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

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: quoteResponsePayload,
                msgName: BulkQuoteAcceptedEvt.name,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });
    //#endregion

    //#region handleGetBulkQuoteQueryReceivedEvt
    test("handleGetBulkQuoteQueryReceivedEvent - should send bulk quote response event if bulk quote exists", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload = {
            requesterFspId: requesterFspId,
            destinationFspId: destinationFspId,
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        };

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload, 
            QueryReceivedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
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
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: responsePayload,
                msgName: BulkQuoteQueryResponseEvt.name,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });
    //#endregion

    //#region handleGetBulkQuoteQueryRejectedEvt
    test("handleGetBulkQuoteQueryRejectedEvent - it should publish bulk quote with error information", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const payload: BulkQuoteRejectedEvtPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Bulk quote error",
            },
            requesterFspId: requesterFspId,
            destinationFspId: destinationFspId
        };

        const inboundProtocolOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const command: CommandMsg = createCommand(
            payload, 
            RejectedBulkQuoteCmd.name, 
            inboundProtocolOpaqueState, 
            MessageTypes.COMMAND
        );

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValueOnce(
            null
        );

        //TODO: add extension list to BulkQuoteRejectedResponseEvtPayload
        const responsePayload = {
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Bulk quote error",
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
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: responsePayload,
                msgName: BulkQuoteRejectedResponseEvt.name,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });

    //#endregion
});
