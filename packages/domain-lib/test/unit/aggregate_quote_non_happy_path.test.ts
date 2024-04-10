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

import { mockedQuote1 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import {
    logger,
    quoteRepo,
    bulkQuoteRepo,
    messageProducer,
    participantService,
    accountLookupService,
    schemaRules,
} from "../utils/mocked_variables";
import { QuotingAggregate } from "./../../src/aggregate";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    createMessage,
    createQuoteQueryReceivedEvtPayload,
    createQuoteQueryRejectedEvtPayload,
    createQuoteRequestReceivedEvtPayload,
    createQuoteResponseReceivedEvtPayload,
} from "../utils/helpers";
import {
    QuoteRejectedEvt,
    QuoteBCDestinationParticipantNotFoundErrorEvent,
    QuoteBCDestinationParticipantNotFoundErrorPayload,
    QuoteBCInvalidDestinationFspIdErrorEvent,
    QuoteBCInvalidDestinationFspIdErrorPayload,
    QuoteBCInvalidMessagePayloadErrorEvent,
    QuoteBCInvalidMessagePayloadErrorPayload,
    QuoteBCInvalidMessageTypeErrorEvent,
    QuoteBCInvalidMessageTypeErrorPayload,
    QuoteBCInvalidRequesterFspIdErrorEvent,
    QuoteBCInvalidRequesterFspIdErrorPayload,
    QuoteBCQuoteExpiredErrorEvent,
    QuoteBCQuoteExpiredErrorPayload,
    QuoteBCQuoteNotFoundErrorEvent,
    QuoteBCQuoteNotFoundErrorPayload,
    QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent,
    QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload,
    QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent,
    QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload,
    QuoteBCRequesterParticipantNotFoundErrorEvent,
    QuoteBCRequesterParticipantNotFoundErrorPayload,
    QuoteBCRequiredDestinationParticipantIdMismatchErrorEvent,
    QuoteBCRequiredDestinationParticipantIdMismatchErrorPayload,
    QuoteBCRequiredDestinationParticipantIsNotActiveErrorEvent,
    QuoteBCRequiredDestinationParticipantIsNotActiveErrorPayload,
    QuoteBCRequiredDestinationParticipantIsNotApprovedErrorEvent,
    QuoteBCRequiredDestinationParticipantIsNotApprovedErrorPayload,
    QuoteBCRequiredRequesterParticipantIdMismatchErrorEvent,
    QuoteBCRequiredRequesterParticipantIdMismatchErrorPayload,
    QuoteBCRequiredRequesterParticipantIsNotActiveErrorEvent,
    QuoteBCRequiredRequesterParticipantIsNotActiveErrorPayload,
    QuoteBCRequiredRequesterParticipantIsNotApprovedErrorEvent,
    QuoteBCRequiredRequesterParticipantIsNotApprovedErrorPayload,
    QuoteBCUnableToAddQuoteToDatabaseErrorEvent,
    QuoteBCUnableToAddQuoteToDatabaseErrorPayload,
    QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent,
    QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload,
    QuoteQueryReceivedEvt,
    QuoteRequestReceivedEvt,
    QuoteResponseReceivedEvt,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { IQuoteSchemeRules, QuoteState } from "@mojaloop/quoting-bc-public-types-lib";
import { QuotingErrorCodeNames } from "@mojaloop/quoting-bc-public-types-lib";

let aggregate: QuotingAggregate;

describe("Domain - Unit Tests for Quote Events, Non Happy Path", () => {
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

    it("should publish error event if message validation fails for payload", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload = null;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
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
        const responsePayload: QuoteBCInvalidMessagePayloadErrorPayload = {
            quoteId: null,
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_PAYLOAD,
            requesterFspId,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidMessagePayloadErrorEvent.name,
            })
        );
    });

    it("should publish error event if message validation fails for message name", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };
        const message: IMessage = createMessage(
            payload,
            undefined as any,
            fspiopOpaqueState
        );
        const responsePayload: QuoteBCInvalidMessageTypeErrorPayload = {
            quoteId: mockedQuote.quoteId,
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_MESSAGE_TYPE,
            requesterFspId,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidMessageTypeErrorEvent.name,
            })
        );
    });

    //#region handleQuoteRequestReceivedEvt
    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId is null or undefined", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload = createQuoteRequestReceivedEvtPayload({
            ...mockedQuote,
            payer: {
                ...mockedQuote.payer,
                partyIdInfo: {
                    ...mockedQuote.payer.partyIdInfo,
                    fspId: null as any,
                },
            },
        });
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId: null as any,
                destinationFspId: mockedQuote.payee.partyIdInfo.fspId,
            }
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            quoteId: mockedQuote.quoteId,
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId: null as any,
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

    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId is not found on participant service due to an error", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequesterParticipantNotFoundErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.SOURCE_PARTICIPANT_NOT_FOUND,
                requesterFspId,
            };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCRequesterParticipantNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId is not found on participant service", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequesterParticipantNotFoundErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.SOURCE_PARTICIPANT_NOT_FOUND,
                requesterFspId,
            };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockRejectedValueOnce(null);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCRequesterParticipantNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId mismatches the one found on participant service", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const fakeParticipantId = "some other fsp id";
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredRequesterParticipantIdMismatchErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH,
                requesterFspId,
            };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockResolvedValueOnce({
            id: fakeParticipantId,
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
                msgName:
                    QuoteBCRequiredRequesterParticipantIdMismatchErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId is not active", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredRequesterParticipantIsNotActiveErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE,
                requesterFspId,
            };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockResolvedValueOnce({
            id: requesterFspId,
            type: "DFSP",
            isActive: false,
            approved: true,
        } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCRequiredRequesterParticipantIsNotActiveErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if requesterFspId is not approved", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredRequesterParticipantIsNotApprovedErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED,
                requesterFspId,
            };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(
            participantService,
            "getParticipantInfo"
        ).mockResolvedValueOnce({
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
            approved: false,
        } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCRequiredRequesterParticipantIsNotApprovedErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if schema validation is incorrect", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const newSchemaRules: IQuoteSchemeRules = {
            currencies: ["ZAR"],
        };

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload =
            {
                quoteId: mockedQuote.quoteId,
                errorCode: QuotingErrorCodeNames.RULE_SCHEME_VIOLATED_REQUEST,
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

        const aggregateWithDifferentSchema = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            true,
            newSchemaRules
        );

        // Act
        await aggregateWithDifferentSchema.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId not provided and when trying to fetch it an error occurs", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const payload = createQuoteRequestReceivedEvtPayload({
            ...mockedQuote,
            payee: {
                ...mockedQuote.payee,
                partyIdInfo: {
                    ...mockedQuote.payee.partyIdInfo,
                    fspId: null as any,
                },
            },
        });

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId: null,
            }
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: null as any,
            quoteId: mockedQuote.quoteId,
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

        jest.spyOn(
            accountLookupService,
            "getAccountLookup"
        ).mockRejectedValueOnce(new Error("Error"));

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

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId not provided and when trying to fetch it returns null from service", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const payload = createQuoteRequestReceivedEvtPayload({
            ...mockedQuote,
            payee: {
                ...mockedQuote.payee,
                partyIdInfo: {
                    ...mockedQuote.payee.partyIdInfo,
                    fspId: null as any,
                },
            },
        });

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId: mockedQuote.payer.partyIdInfo.fspId,
                destinationFspId: null,
            }
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: null as any,
            quoteId: mockedQuote.quoteId,
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

        jest.spyOn(
            accountLookupService,
            "getAccountLookup"
        ).mockResolvedValueOnce(null);

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

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId not found on participant service due to an error", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCDestinationParticipantNotFoundErrorPayload =
            {
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.DESTINATION_PARTICIPANT_NOT_FOUND,
                destinationFspId: destinationFspId as string,
                quoteId: mockedQuote.quoteId,
            };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCDestinationParticipantNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId not found on participant service", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCDestinationParticipantNotFoundErrorPayload =
            {
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.DESTINATION_PARTICIPANT_NOT_FOUND,
                destinationFspId: destinationFspId as string,
                quoteId: mockedQuote.quoteId,
            };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: "DFSP",
                isActive: true,
                approved: true,
            } as IParticipant)
            .mockResolvedValueOnce(null);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCDestinationParticipantNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId mismatches the one fetched on participant service", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);
        const mismatchDestinationFspId = "some other fsp id";

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredDestinationParticipantIdMismatchErrorPayload =
            {
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH,
                destinationFspId: destinationFspId as string,
                quoteId: mockedQuote.quoteId,
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
                id: mismatchDestinationFspId,
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
                msgName:
                    QuoteBCRequiredDestinationParticipantIdMismatchErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId is not approved", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredDestinationParticipantIsNotApprovedErrorPayload =
            {
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED,
                destinationFspId: destinationFspId as string,
                quoteId: mockedQuote.quoteId,
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
                approved: false,
            } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCRequiredDestinationParticipantIsNotApprovedErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if destination fspId is not active", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCRequiredDestinationParticipantIsNotActiveErrorPayload =
            {
                bulkQuoteId: null,
                errorCode: QuotingErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE,
                destinationFspId: destinationFspId as string,
                quoteId: mockedQuote.quoteId,
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
                isActive: false,
                approved: true,
            } as IParticipant);

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName:
                    QuoteBCRequiredDestinationParticipantIsNotActiveErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if quote is expired", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const surpassedExpiration = new Date(Date.now() - 1000).toDateString();
        const payload = createQuoteRequestReceivedEvtPayload({
            ...mockedQuote,
            expiration: surpassedExpiration,
        });

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCQuoteExpiredErrorPayload = {
            errorCode: QuotingErrorCodeNames.QUOTE_EXPIRED,
            quoteId: mockedQuote.quoteId,
            expirationDate: surpassedExpiration,
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

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteExpiredErrorEvent.name,
            })
        );
    });

    test("handleQuoteRequestReceivedEvent - should send error event if couldnt store quote on passthrough mode", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRequestReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCUnableToAddQuoteToDatabaseErrorPayload = {
            errorCode: QuotingErrorCodeNames.UNABLE_TO_ADD_QUOTE,
            quoteId: mockedQuote.quoteId,
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

        jest.spyOn(quoteRepo, "addQuote").mockRejectedValueOnce(
            new Error("Error")
        );

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        // Act
        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCUnableToAddQuoteToDatabaseErrorEvent.name,
            })
        );
    });

    //#endregion

    //#region handleQuoteResponseReceivedEvt
    test("handleQuoteResponseReceivedEvent - should send error event if quote is rejected due to violation of schema rules and store quote with rejected status on database if passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId as string;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteResponseReceivedEvtPayload(mockedQuote);
        const invalidSchema: IQuoteSchemeRules = {
            currencies: ["ZAR"],
        };

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload =
            {
                errorCode: QuotingErrorCodeNames.RULE_SCHEME_VIOLATED_REQUEST,
                quoteId: mockedQuote.quoteId,
            };

        const aggregateWithDifferentSchemaAndPassthroughModeDisabled =
            new QuotingAggregate(
                logger,
                quoteRepo,
                bulkQuoteRepo,
                messageProducer,
                participantService,
                accountLookupService,
                false,
                invalidSchema
            );

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "updateQuote").mockResolvedValueOnce();

        // Act

        await aggregateWithDifferentSchemaAndPassthroughModeDisabled.handleQuotingEvent(
            message
        );

        // Assert
        expect(quoteRepo.updateQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                status: QuoteState.REJECTED,
            })
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent.name,
            })
        );
    });

    test("handleQuoteResponseReceivedEvent - should send error event if quote is rejected due invalid requester and store quote with rejected status on database if passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteResponseReceivedEvtPayload({
            ...mockedQuote,
            payer: {
                ...mockedQuote.payer,
                partyIdInfo: {
                    ...mockedQuote.payer.partyIdInfo,
                    fspId: null as any,
                },
            },
        });

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            {
                requesterFspId: null as any,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            bulkQuoteId: null,
            requesterFspId: null as any,
            quoteId: mockedQuote.quoteId,
        };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "updateQuote").mockResolvedValueOnce();

        // Act

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                status: QuoteState.REJECTED,
            })
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidRequesterFspIdErrorEvent.name,
            })
        );
    });

    test("handleQuoteResponseReceivedEvent - should send error event if quote is rejected due invalid destination and store quote with rejected status on database if passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const payload = createQuoteResponseReceivedEvtPayload({
            ...mockedQuote,
            payee: {
                ...mockedQuote.payee,
                partyIdInfo: {
                    ...mockedQuote.payee.partyIdInfo,
                    fspId: null as any,
                },
            },
        });

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId: null as any,
            }
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            bulkQuoteId: null,
            destinationFspId: null as any,
            quoteId: mockedQuote.quoteId,
        };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "updateQuote").mockResolvedValueOnce();

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

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                status: QuoteState.REJECTED,
            })
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCInvalidDestinationFspIdErrorEvent.name,
            })
        );
    });

    test("handleQuoteResponseReceivedEvent - should send error event if quote is rejected due to expiration and store quote with expired status on database if passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const surpassedExpiration = new Date(Date.now() - 1000).toDateString();
        const payload = createQuoteResponseReceivedEvtPayload({
            ...mockedQuote,
            expiration: surpassedExpiration,
        });

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCQuoteExpiredErrorPayload = {
            errorCode: QuotingErrorCodeNames.QUOTE_EXPIRED,
            quoteId: mockedQuote.quoteId,
            expirationDate: surpassedExpiration,
        };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "updateQuote").mockResolvedValueOnce();

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

        // Act

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(quoteRepo.updateQuote).toHaveBeenCalledWith(
            expect.objectContaining({
                status: QuoteState.EXPIRED,
            })
        );
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteExpiredErrorEvent.name,
            })
        );
    });

    test("handleQuoteResponseReceivedEvent - should send error event if cant update the quote status", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteResponseReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteResponseReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload =
            {
                errorCode: QuotingErrorCodeNames.UNABLE_TO_UPDATE_QUOTE,
                quoteId: mockedQuote.quoteId,
            };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "updateQuote").mockRejectedValueOnce(new Error());

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

        // Act

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent.name,
            })
        );
    });

    //#endregion

    //#region handleQuoteQueryReceivedEvt
    test("handleQuoteQueryReceivedEvent - should send error event if quote is rejected due to invalid requester fsp", async () => {
        const mockedQuote = mockedQuote1;
        const requesterFspId = null;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteQueryReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId: null as any,
            quoteId: mockedQuote.quoteId,
        };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(null);

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

    test("handleQuoteQueryReceivedEvent - should send error event if quote is rejected due to invalid destination fsp", async () => {
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const payload = createQuoteQueryReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: null as any,
            quoteId: mockedQuote.quoteId,
        };

        jest.spyOn(messageProducer, "send");

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(null);

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

    test("handleQuoteQueryReceivedEvent - should send error event if quote is not found on database with passthrough mode enabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteQueryReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            {
                requesterFspId: mockedQuote.payer.partyIdInfo.fspId,
                destinationFspId: mockedQuote.payee.partyIdInfo.fspId,
            }
        );

        const responsePayload: QuoteBCQuoteNotFoundErrorPayload = {
            errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            quoteId: mockedQuote.quoteId,
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

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(null);

        // Act

        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteQueryReceivedEvent - should send error event if quote is not found on database and passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteQueryReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            {
                requesterFspId: mockedQuote.payer.partyIdInfo.fspId,
                destinationFspId: mockedQuote.payee.partyIdInfo.fspId,
            }
        );

        const responsePayload: QuoteBCQuoteNotFoundErrorPayload = {
            errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            quoteId: mockedQuote.quoteId,
        };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

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

        jest.spyOn(quoteRepo, "getQuoteById").mockResolvedValueOnce(null);

        // Act

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteNotFoundErrorEvent.name,
            })
        );
    });

    test("handleQuoteQueryReceivedEvent - should send error event if fetching a quote throws error and passthrough mode is disabled", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteQueryReceivedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteQueryReceivedEvt.name,
            {
                requesterFspId: mockedQuote.payer.partyIdInfo.fspId,
                destinationFspId: mockedQuote.payee.partyIdInfo.fspId,
            }
        );

        const responsePayload: QuoteBCQuoteNotFoundErrorPayload = {
            errorCode: QuotingErrorCodeNames.QUOTE_NOT_FOUND,
            quoteId: mockedQuote.quoteId,
        };

        const aggregateWithoutPassthroughMode = new QuotingAggregate(
            logger,
            quoteRepo,
            bulkQuoteRepo,
            messageProducer,
            participantService,
            accountLookupService,
            false,
            schemaRules
        );

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

        jest.spyOn(quoteRepo, "getQuoteById").mockRejectedValueOnce(
            new Error()
        );

        // Act

        await aggregateWithoutPassthroughMode.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: responsePayload,
                msgName: QuoteBCQuoteNotFoundErrorEvent.name,
            })
        );
    });

    //#endregion

    //#region handleGetQuoteQueryRejectedEvt
    test("handleQuoteRejectedEvent - should send error event if quote is rejected due to invalid requester fsp", async () => {
        const mockedQuote = mockedQuote1;
        const requesterFspId = null;
        const destinationFspId = mockedQuote.payee.partyIdInfo.fspId;
        const payload = createQuoteQueryRejectedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRejectedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId: null as any,
            quoteId: mockedQuote.quoteId,
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

    test("handleQuoteRejectedEvent - should send error event if quote is rejected due to invalid destination fsp", async () => {
        const mockedQuote = mockedQuote1;
        const requesterFspId = mockedQuote.payer.partyIdInfo.fspId;
        const destinationFspId = null;
        const payload = createQuoteQueryRejectedEvtPayload(mockedQuote);

        const message: IMessage = createMessage(
            payload,
            QuoteRejectedEvt.name,
            {
                requesterFspId,
                destinationFspId,
            }
        );

        const responsePayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
            bulkQuoteId: null,
            errorCode: QuotingErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: null as any,
            quoteId: mockedQuote.quoteId,
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

    //#endregion
});
