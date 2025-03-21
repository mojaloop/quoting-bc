/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
**/

"use strict";

import { CommandMsg, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import {
    QuoteRejectedEvtPayload,
    QuoteQueryReceivedEvtPayload,
    QuoteQueryResponseEvtPayload,
    QuoteRequestAcceptedEvt,
    QuoteRequestAcceptedEvtPayload,
    QuoteRequestReceivedEvtPayload,
    QuoteResponseAcceptedEvt,
    QuoteResponseAcceptedEvtPayload,
    QuoteResponseReceivedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMoney } from "@mojaloop/quoting-bc-public-types-lib";
import {
    createCommand,
    createQuoteQueryRejectedEvtPayload,
    createQuoteRequestReceivedEvtPayload,
    createQuoteResponseReceivedEvtPayload,
} from "../utils/helpers";
import {
    quoteRepo,
    messageProducer,
    participantService,
    accountLookupService,
    logger,
    bulkQuoteRepo,
    currencyList,
} from "../utils/mocked_variables";
import {
    MemoryTracing,
    mockedQuote1,
    mockedQuote4,
} from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../src/aggregate";
import { IMetrics, ITracing, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { QueryReceivedQuoteCmd, RejectedQuoteCmd, RequestReceivedQuoteCmd, ResponseReceivedQuoteCmd } from "../../src/commands";

let aggregate: QuotingAggregate;

const metricsMock: IMetrics = new MetricsMock();
const tracingMock: ITracing = new MemoryTracing();

const PASS_THROUGH_MODE = true;
const PASS_THROUGH_MODE_FALSE = false;

describe("Domain - Unit Tests for Quote Events", () => {
    beforeAll(async () => {
        aggregate = new QuotingAggregate(
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
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    it("Aggregate should be correctly instantiated", async () => {
        expect(aggregate).toBeTruthy();
    });

    //#region handleQuoteRequestReceivedEvt
    test("handleQuoteRequestReceivedEvent - should call getAccountLookup if destination fspId is not provided in opaque state and in quote", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload({
                ...mockedQuote,
                payee: {
                    ...mockedQuote.payee,
                    partyIdInfo: {
                        ...mockedQuote.payee.partyIdInfo,
                        fspId: null,
                    },
                },
            });

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const inboundProtocolOpaqueState = {
            requesterFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const accountLookupServiceSpy = jest
            .spyOn(accountLookupService, "getAccountLookup")
            .mockResolvedValueOnce(mockedQuote.payee.partyIdInfo.fspId);

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: mockedQuote.payee.partyIdInfo.fspId,
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

    test("handleQuoteRequestReceivedEvent - should add destination payee fspid to quote if not provided on quote", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload({
                ...mockedQuote,
                payee: {
                    ...mockedQuote.payee,
                    partyIdInfo: {
                        ...mockedQuote.payee.partyIdInfo,
                        fspId: null,
                    },
                },
            });

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const inboundProtocolOpaqueState = {
            requesterFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const responsePayload: QuoteRequestAcceptedEvtPayload = {
            quoteId: mockedQuote.quoteId,
            transactionId: mockedQuote.transactionId,
            transactionRequestId: mockedQuote.transactionRequestId,
            payee: mockedQuote.payee,
            payer: mockedQuote.payer,
            amountType: mockedQuote.amountType,
            amount: mockedQuote.amount,
            fees: mockedQuote.feesPayer,
            transactionType: mockedQuote.transactionType,
            geoCode: mockedQuote.geoCode,
            note: mockedQuote.note,
            expiration: mockedQuote.expiration,
            converter: null,
            currencyConversion: null,
            extensions: [],
        };

        jest.spyOn(
            accountLookupService,
            "getAccountLookup"
        ).mockResolvedValueOnce(mockedQuote.payee.partyIdInfo.fspId);

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: mockedQuote.payer.partyIdInfo.fspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce({
                id: mockedQuote.payee.partyIdInfo.fspId,
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
                msgName: QuoteRequestAcceptedEvt.name,
            })]
        );
    });

    test("handleQuoteRequestReceivedEvent - should add quote to quote repo without passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const inboundProtocolOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );


        const aggregateWithPassThrough = new QuotingAggregate(
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
        await aggregateWithPassThrough.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith([
            expect.objectContaining({
                "msgName": QuoteRequestAcceptedEvt.name,
                "payload": payload
            }),
        ]);
    });

    test("handleQuoteRequestReceivedEvent - should not add quote to quote repo with passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const inboundProtocolOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
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

        jest.spyOn(quoteRepo, "storeQuotes");

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(quoteRepo.storeQuotes).toHaveBeenCalledTimes(0);
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                msgName: QuoteRequestAcceptedEvt.name,
                payload: payload
            })]
        );
    });

    test("handleQuoteRequestReceivedEvent - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const inboundProtocolOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const responsePayload: QuoteRequestAcceptedEvtPayload = {
            quoteId: mockedQuote.quoteId,
            transactionId: mockedQuote.transactionId,
            transactionRequestId: mockedQuote.transactionRequestId,
            payee: mockedQuote.payee,
            payer: mockedQuote.payer,
            amountType: mockedQuote.amountType,
            amount: mockedQuote.amount,
            fees: mockedQuote.feesPayer,
            transactionType: mockedQuote.transactionType,
            geoCode: mockedQuote.geoCode,
            note: mockedQuote.note,
            expiration: mockedQuote.expiration,
            converter: null,
            currencyConversion: null,
            extensions: [],
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
                msgName: QuoteRequestAcceptedEvt.name,
            })]
        );
    });

    //#endregion

    //#region handleQuoteResponseReceivedEvt

    test("handleQuoteResponseReceivedEvent - should update quote on quote repository without passthrough", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteResponseReceivedEvtPayload =
            createQuoteResponseReceivedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload,
            ResponseReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );


        const aggregateWithPassThrough = new QuotingAggregate(
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

        const payloadResponse = {
            quoteId: payload.quoteId,
            expiration: payload.expiration,
            note: payload.note,
            geoCode: payload.geoCode,
            payeeReceiveAmount: payload.payeeReceiveAmount,
            transferAmount: payload.transferAmount,
            payeeFspCommission: payload.payeeFspCommission,
            payeeFspFee: payload.payeeFspFee,
            extensions: payload.extensions,
        };

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            mockedQuote
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
        await aggregateWithPassThrough.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith([
            expect.objectContaining({
                "msgName": QuoteResponseAcceptedEvt.name,
                "payload": payloadResponse
            }),
        ]);
    });

    test("handleQuoteResponseReceivedEvent - should not update quote on quote repository with passthrough", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteResponseReceivedEvtPayload =
            createQuoteResponseReceivedEvtPayload(mockedQuote);

        const inboundProtocolOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const command: CommandMsg = createCommand(
            payload,
            RequestReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const repositorySpy = jest.spyOn(quoteRepo, "storeQuotes");

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
        expect(repositorySpy).toHaveBeenCalledTimes(0);
    });

    test("handleQuoteResponseReceivedEvent - should send quote response accepted event", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteResponseReceivedEvtPayload =
            createQuoteResponseReceivedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload,
            ResponseReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const quoteResponsePayload: QuoteResponseAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string,
            note: mockedQuote.note,
            geoCode: mockedQuote.geoCode,
            quoteId: mockedQuote.quoteId,
            transferAmount: mockedQuote.totalTransferAmount as IMoney,
            payeeFspCommission: mockedQuote.payeeFspCommission as IMoney,
            payeeFspFee: mockedQuote.payeeFspFee as IMoney,
            payeeReceiveAmount: mockedQuote.payeeReceiveAmount as IMoney,
            extensions: [],
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

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            mockedQuote
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: quoteResponsePayload,
                msgName: QuoteResponseAcceptedEvt.name,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });
    //#endregion

    //#region handleQuoteQueryReceivedEvt

    test("handleQuoteQueryReceivedEvent - should respond with a successful event for the asked quote", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const mockedQuoteResponse = mockedQuote4;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteQueryReceivedEvtPayload = {
            quoteId: mockedQuote.quoteId,
            requesterFspId: requesterFspId,
            destinationFspId: destinationFspId,
        };

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload,
            QueryReceivedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const payloadResponse: QuoteQueryResponseEvtPayload = {
            quoteId: mockedQuoteResponse.quoteId,
            expiration: mockedQuoteResponse.expiration as string,
            note: mockedQuoteResponse.note,
            transferAmount: mockedQuoteResponse.totalTransferAmount as IMoney,
            geoCode: mockedQuoteResponse.geoCode,
            payeeFspCommission: mockedQuoteResponse.payeeFspCommission,
            payeeFspFee: mockedQuoteResponse.payeeFspFee,
            payeeReceiveAmount: mockedQuoteResponse.payeeReceiveAmount,
            extensions: [],
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

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            mockedQuoteResponse
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: payloadResponse,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });

    //#endregion

    //#region QuoteRejectedEvt
    test("handleQuoteRejectedEvent - should publish quote event with error information", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const mockedQuoteResponse = mockedQuote4;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteRejectedEvtPayload =
            createQuoteQueryRejectedEvtPayload(mockedQuote, {
                requesterFspId: requesterFspId,
                destinationFspId: destinationFspId
            });

        const inboundProtocolOpaqueState = {
            exampleProperty: "randomValue"
        };

        const command: CommandMsg = createCommand(
            payload,
            RejectedQuoteCmd.name,
            inboundProtocolOpaqueState,
            MessageTypes.COMMAND
        );

        const payloadResponse = {
            quoteId: mockedQuote.quoteId,
            errorInformation: mockedQuote.errorInformation as any,
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

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(
            mockedQuoteResponse
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.processCommandBatch([command]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            [expect.objectContaining({
                payload: payloadResponse,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState,
            })]
        );
    });

    //#endregion
});
