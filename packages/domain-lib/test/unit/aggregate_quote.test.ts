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
    GetQuoteQueryRejectedEvt,
    GetQuoteQueryRejectedEvtPayload,
    QuoteQueryReceivedEvt,
    QuoteQueryReceivedEvtPayload,
    QuoteQueryResponseEvtPayload,
    QuoteRequestAcceptedEvt,
    QuoteRequestAcceptedEvtPayload,
    QuoteRequestReceivedEvt,
    QuoteRequestReceivedEvtPayload,
    QuoteResponseAccepted,
    QuoteResponseAcceptedEvtPayload,
    QuoteResponseReceivedEvt,
    QuoteResponseReceivedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMoney, QuoteState } from "@mojaloop/quoting-bc-public-types-lib";
import {
    createMessage,
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
    schemaRules,
} from "../utils/mocked_variables";
import {
    mockedQuote1,
    mockedQuote4,
} from "@mojaloop/quoting-bc-shared-mocks-lib";
import { QuotingAggregate } from "../../src/aggregate";

let aggregate: QuotingAggregate;

describe("Domain - Unit Tests for Quote Events", () => {
    beforeAll(async () => {
        aggregate = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            true,
            schemaRules
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
        const fspiopOpaqueState = {
            requesterFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            fspiopOpaqueState
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
        await aggregate.handleQuotingEvent(message);

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
        const fspiopOpaqueState = {
            requesterFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            fspiopOpaqueState
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
            extensionList: mockedQuote.extensionList,
            converter: null,
            currencyConversion: null
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
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteRequestAcceptedEvt.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should add quote to quote repo without passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            fspiopOpaqueState
        );

        const aggregateWithPassThrough = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
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

        jest.spyOn(quoteRepo, "addQuote").mockResolvedValueOnce(
            mockedQuote.quoteId
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregateWithPassThrough.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.addQuote).toHaveBeenCalled();
        expect(quoteRepo.addQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                quoteId: mockedQuote.quoteId,
                status: QuoteState.PENDING,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should add quote to quote repo with passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            fspiopOpaqueState
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

        jest.spyOn(quoteRepo, "addQuote").mockResolvedValueOnce(
            mockedQuote.quoteId
        );

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.addQuote).toHaveBeenCalledTimes(0);
    });

    test("handleQuoteRequestReceivedEvent - should publish QuoteRequestAcceptedEvt if event runs successfully", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: QuoteRequestReceivedEvtPayload =
            createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            fspiopOpaqueState
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
            extensionList: mockedQuote.extensionList,
            converter: null,
            currencyConversion: null
        };

        jest.spyOn(quoteRepo, "addQuote").mockResolvedValueOnce(
            mockedQuote.quoteId
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
                msgName: QuoteRequestAcceptedEvt.name,
            })
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
            createQuoteResponseReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };
        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            fspiopOpaqueState
        );

        const aggregateWithPassThrough = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        const repositorySpy = jest.spyOn(quoteRepo, "updateQuote");

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
        await aggregateWithPassThrough.handleQuotingEvent(message);

        // Assert
        expect(repositorySpy).toHaveBeenCalled();
        expect(repositorySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                expiration: mockedQuote.expiration,
                geoCode: mockedQuote.geoCode,
                quoteId: mockedQuote.quoteId,
                status: QuoteState.ACCEPTED,
            })
        );
    });

    test("handleQuoteResponseReceivedEvent - should not update quote on quote repository with passthrough", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteResponseReceivedEvtPayload =
            createQuoteResponseReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };
        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            fspiopOpaqueState
        );

        const repositorySpy = jest.spyOn(quoteRepo, "updateQuote");

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
        expect(repositorySpy).toHaveBeenCalledTimes(0);
    });

    test("handleQuoteResponseReceivedEvent - should send quote response accepted event", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload: QuoteResponseReceivedEvtPayload =
            createQuoteResponseReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            fspiopOpaqueState
        );

        const quoteResponsePayload: QuoteResponseAcceptedEvtPayload = {
            expiration: mockedQuote.expiration as string,
            geoCode: mockedQuote.geoCode,
            quoteId: mockedQuote.quoteId,
            extensionList: mockedQuote.extensionList,
            condition: mockedQuote.condition as string,
            ilpPacket: mockedQuote.ilpPacket as string,
            transferAmount: mockedQuote.totalTransferAmount as IMoney,
            payeeFspCommission: mockedQuote.payeeFspCommission as IMoney,
            payeeFspFee: mockedQuote.payeeFspFee as IMoney,
            payeeReceiveAmount: mockedQuote.payeeReceiveAmount as IMoney,
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
                fspiopOpaqueState: fspiopOpaqueState,
                payload: quoteResponsePayload,
                msgName: QuoteResponseAccepted.name,
            })
        );
    });
    //#endregion

    //#region handleQuoteQueryReceivedEvt

    test("handleQuoteQueryReceivedEvent - should respond with a successful event for the asked quote", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const mockedQuoteResponse = mockedQuote4;
        const payload: QuoteQueryReceivedEvtPayload = {
            quoteId: mockedQuote.quoteId,
        };

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            fspiopOpaqueState
        );

        const payloadResponse: QuoteQueryResponseEvtPayload = {
            quoteId: mockedQuoteResponse.quoteId,
            condition: mockedQuoteResponse.condition as string,
            expiration: mockedQuoteResponse.expiration as string,
            transferAmount: mockedQuoteResponse.totalTransferAmount as IMoney,
            extensionList: mockedQuoteResponse.extensionList,
            geoCode: mockedQuoteResponse.geoCode,
            ilpPacket: mockedQuoteResponse.ilpPacket as string,
            payeeFspCommission: mockedQuoteResponse.payeeFspCommission,
            payeeFspFee: mockedQuoteResponse.payeeFspFee,
            payeeReceiveAmount: mockedQuoteResponse.payeeReceiveAmount,
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
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                fspiopOpaqueState: fspiopOpaqueState,
                payload: payloadResponse,
            })
        );
    });

    //#endregion

    //#region GetQuoteQueryRejectedEvt
    test("handleGetQuoteQueryRejectedEvent - should publish quote event with error information", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload: GetQuoteQueryRejectedEvtPayload =
            createQuoteQueryRejectedEvtPayload(mockedQuote);

        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;

        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(
            payload,
            GetQuoteQueryRejectedEvt.name,
            fspiopOpaqueState
        );

        const payloadResponse: GetQuoteQueryRejectedEvtPayload = {
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

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                fspiopOpaqueState: fspiopOpaqueState,
                payload: payloadResponse,
            })
        );
    });

    //#endregion
});
