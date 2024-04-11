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

import {
    QuoteBCInvalidBulkQuoteLengthErrorEvent,
    BulkQuoteRequestedEvt,
    QuoteBCInvalidBulkQuoteLengthErrorPayload,
    QuoteBCInvalidRequesterFspIdErrorPayload,
    QuoteBCInvalidRequesterFspIdErrorEvent,
    QuoteBCInvalidDestinationFspIdErrorEvent,
    QuoteBCInvalidDestinationFspIdErrorPayload,
    QuoteBCBulkQuoteExpiredErrorPayload,
    QuoteBCBulkQuoteExpiredErrorEvent,
    QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload,
    QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent,
    BulkQuotePendingReceivedEvt,
    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload,
    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent,
    BulkQuoteQueryReceivedEvt,
    QuoteBCBulkQuoteNotFoundErrorEvent,
    QuoteBCBulkQuoteNotFoundErrorPayload,
    GetBulkQuoteQueryRejectedEvt,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
    createBulkQuotePendingReceivedEvtPayload,
    createBulkQuoteQueryReceivedEvtPayload,
    createBulkQuoteQueryRejectedEvtPayload,
    createBulkQuoteRequestedEvtPayload,
    createMessage,
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
import { QuotingAggregate } from "./../../src/aggregate";
import { mockedBulkQuote1 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { IQuote } from "@mojaloop/quoting-bc-public-types-lib";
import { QuotingErrorCodeNames } from "@mojaloop/quoting-bc-public-types-lib";

describe("Domain - Unit Tests for Bulk Quote Events, Non Happy Path", () => {
    let aggregate: QuotingAggregate;

    beforeEach(() => {
        aggregate = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            true,
            currencyList
        );
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    //#region handleBulkQuoteRequestedEvent
    test("handleBulkQuoteRequestedEvent - should return error event if no individual quotes are present", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload({
            ...mockedBulkQuote,
            individualQuotes: [] as IQuote[],
        });

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidBulkQuoteLengthErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.INVALID_BULK_QUOTE_LENGTH,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidBulkQuoteLengthErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should return error event if requester participant validation fails", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            requesterFspId,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should return error event if no destination fspId provided and couldnt fetch a new one from lookup", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId: null as any,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        jest.spyOn(accountLookupService, "getAccountLookup").mockResolvedValue(
            null
        );

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should return error event if no destination fspId provided and couldnt fetch a new one due to lookup service error", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId: null as any,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        jest.spyOn(accountLookupService, "getAccountLookup").mockRejectedValue(
            new Error("Error fetching account lookup")
        );

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should try to fetch destination fspid for all individual quotes in the worst case scenario", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId: null as any,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        const lookupSpy = jest
            .spyOn(accountLookupService, "getAccountLookup")
            .mockRejectedValue(new Error("Error fetching account lookup"));

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(lookupSpy).toHaveBeenCalledTimes(
            mockedBulkQuote.individualQuotes.length
        );
    });

    test("handleBulkQuoteRequestedEvent - should send error event if bulk quote is expired", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const surpassedExpiration = new Date(Date.now() - 1000).toDateString();
        const payload = createBulkQuoteRequestedEvtPayload({
            ...mockedBulkQuote,
            expiration: surpassedExpiration,
        });

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteExpiredErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            expirationDate: surpassedExpiration,
            errorCode: QuotingErrorCodeNames.BULK_QUOTE_EXPIRED,
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
                msgName: QuoteBCBulkQuoteExpiredErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should send error event if aggregate is not on passthrough mode and is unable to add bulk quote to the database", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_ADD_BULK_QUOTE,
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

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockRejectedValue(
            new Error("Error adding bulk quote to database")
        );
        jest.spyOn(messageProducer, "send");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuoteRequestedEvent - should send error event if aggregate is not on passthrough mode and is unable to add the individual quotes that belong to bulk quote to the database", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteRequestedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteRequestedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_ADD_BULK_QUOTE,
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

        jest.spyOn(bulkQuoteRepo, "addBulkQuote").mockResolvedValueOnce(
            "inserted bulk quote"
        );
        jest.spyOn(quoteRepo, "addQuotes").mockRejectedValue(
            new Error("Error adding quotes to database")
        );
        jest.spyOn(messageProducer, "send");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent.name,
            })
        );
    });
    //#endregion handleBulkQuotePendingReceivedEvt

    //#region handleBulkQuotePendingReceivedEvent
    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            requesterFspId,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and update bulk quote and related quotes as rejected on database", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );

        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            requesterFspId,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );
        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue(
            responseQuotes
        );
        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValue();

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuotes).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    ...responseQuotes[0],
                    status: "REJECTED",
                }),
                expect.objectContaining({
                    ...responseQuotes[1],
                    status: "REJECTED",
                }),
            ])
        );

        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledWith({
            ...mockedBulkQuote,
            status: "REJECTED",
        });

        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and when updating bulk quote on database cant find the original", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
            };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(null);

        jest.spyOn(logger, "error");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            `Bulk Quote not found for bulkQuoteId: ${mockedBulkQuote.bulkQuoteId}`
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and when updating bulk quote on database a error is thrown when trying to find the original on database", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
            };

        jest.spyOn(messageProducer, "send");

        const error = new Error("Error fetching bulk quote from database");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockRejectedValue(error);

        jest.spyOn(logger, "error");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            `Error getting bulk quote:${mockedBulkQuote.bulkQuoteId}`,
            error
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and when updating bulk quote on database a error is thrown when trying to get the quotes belonging to bulk quote", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
            };

        jest.spyOn(messageProducer, "send");

        const error = new Error("Error fetching quotes from database");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockRejectedValue(
            error
        );

        jest.spyOn(logger, "error");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            `Error getting quotes for bulk quote:${mockedBulkQuote.bulkQuoteId}`,
            error
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and when updating bulk quote on database a error is thrown when trying to update the quotes that belong to bulk quote", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
            };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValueOnce(
            responseQuotes
        );

        const error = new Error("Error updating quotes in database");
        jest.spyOn(quoteRepo, "updateQuotes").mockRejectedValue(error);

        jest.spyOn(logger, "error");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            `Error updating quotes for bulkQuoteId: ${mockedBulkQuote.bulkQuoteId}.`,
            error
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if requester is invalid and when updating bulk quote on database a error is thrown ", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorPayload =
            {
                bulkQuoteId: mockedBulkQuote.bulkQuoteId,
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_BULK_QUOTE,
            };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValueOnce(
            responseQuotes
        );

        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValueOnce();

        const error = new Error("Error updating bulk quote in database");

        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockRejectedValue(error);

        jest.spyOn(logger, "error");

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(logger.error).toHaveBeenCalledWith(
            `Error updating bulk quote for bulkQuoteId: ${mockedBulkQuote.bulkQuoteId}.`,
            error
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCUnableToUpdateBulkQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if destination is invalid and update bulk quote and related quotes as rejected on database", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );

        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId: null as any,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockResolvedValueOnce({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );
        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue(
            responseQuotes
        );
        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValue();

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuotes).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    ...responseQuotes[0],
                    status: "REJECTED",
                }),
                expect.objectContaining({
                    ...responseQuotes[1],
                    status: "REJECTED",
                }),
            ])
        );

        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledWith({
            ...mockedBulkQuote,
            status: "REJECTED",
        });

        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    test("handleBulkQuotePendingReceivedEvent - should return error event if quote is expired and update bulk quote and related quotes as expired on database", async () => {
        // Arrange
        const surpassedExpiration = new Date(Date.now() - 1000).toDateString();
        const mockedBulkQuote = {
            ...mockedBulkQuote1,
            expiration: surpassedExpiration,
        };
        const responseQuotes = mockedBulkQuote1.individualQuotes.map(
            (quote) => ({
                ...quote,
            })
        );

        const payload =
            createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuotePendingReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteExpiredErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            expirationDate: surpassedExpiration,
            errorCode: QuotingErrorCodeNames.BULK_QUOTE_EXPIRED,
        };

        jest.spyOn(messageProducer, "send");

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

        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(
            mockedBulkQuote
        );
        jest.spyOn(bulkQuoteRepo, "updateBulkQuote").mockResolvedValue();

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValue(
            responseQuotes
        );
        jest.spyOn(quoteRepo, "updateQuotes").mockResolvedValue();

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuotes).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    ...responseQuotes[0],
                    status: "EXPIRED",
                }),
                expect.objectContaining({
                    ...responseQuotes[1],
                    status: "EXPIRED",
                }),
            ])
        );

        expect(bulkQuoteRepo.updateBulkQuote).toHaveBeenCalledWith({
            ...mockedBulkQuote,
            status: "EXPIRED",
        });

        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteExpiredErrorEvent.name,
            })
        );
    });

    //#endregion handleBulkQuotePendingReceivedEvent

    //#region handleGetBulkQuoteQueryReceivedEvent
    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if with passthrough mode is enabled", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
        };

        jest.spyOn(messageProducer, "send");
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
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockRejectedValueOnce(
            mockedBulkQuote.individualQuotes
        );

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if requester is invalid", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            requesterFspId,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if destination is invalid", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null as any;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if without pass through mode cant find a bulk quote by its id", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
        };

        jest.spyOn(messageProducer, "send");
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
        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockResolvedValue(null);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if without pass through mode when trying to get a bulk quote by id an error occurs", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.BULK_QUOTE_NOT_FOUND,
        };

        jest.spyOn(messageProducer, "send");
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
        jest.spyOn(bulkQuoteRepo, "getBulkQuoteById").mockRejectedValueOnce(
            new Error("Error fetching bulk quote from database")
        );

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if without pass through mode when trying to get individual quote for the bulk quote and none is returned", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.INDIVIDUAL_QUOTES_NOT_FOUND,
        };

        jest.spyOn(messageProducer, "send");
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
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockResolvedValueOnce(
            []
        );

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryReceivedEvent - should return error event if without pass through mode when trying to get individual quote for the bulk quote a error occurs", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const payload = createBulkQuoteQueryReceivedEvtPayload(mockedBulkQuote);

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            errorCode: QuotingErrorCodeNames.INDIVIDUAL_QUOTES_NOT_FOUND,
        };

        jest.spyOn(messageProducer, "send");
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
            mockedBulkQuote
        );

        jest.spyOn(quoteRepo, "getQuotesByBulkQuoteId").mockRejectedValueOnce(
            new Error("Error fetching quotes from database")
        );

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            currencyList
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCBulkQuoteNotFoundErrorEvent.name,
            })
        );
    });

    //#endregion handleGetBulkQuoteQueryReceivedEvent

    //#region handleGetBulkQuoteQueryRejectedEvent
    test("handleGetBulkQuoteQueryRejectedEvent - should return error event if requester is invalid", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const errorInformation = {
            errorCode: "3200",
            errorDescription: "Generic payer error",
            extensionList: null,
        };
        const payload = createBulkQuoteQueryRejectedEvtPayload(
            mockedBulkQuote,
            errorInformation
        );

        const requesterFspId = null as any;
        const destinationFspId = "destinationFspId";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            GetBulkQuoteQueryRejectedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            requesterFspId,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleGetBulkQuoteQueryRejectedEvent - should return error event if destination is invalid", async () => {
        // Arrange
        const mockedBulkQuote = mockedBulkQuote1;
        const errorInformation = {
            errorCode: "3200",
            errorDescription: "Generic payer error",
            extensionList: null,
        };
        const payload = createBulkQuoteQueryRejectedEvtPayload(
            mockedBulkQuote,
            errorInformation
        );

        const requesterFspId = mockedBulkQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null as any;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            BulkQuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: mockedBulkQuote.bulkQuoteId,
            quoteId: null,
            destinationFspId,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockResolvedValueOnce({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: true,
        } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    //#endregion handleGetBulkQuoteQueryRejectedEvent
});
