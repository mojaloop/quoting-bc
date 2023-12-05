import { mockedQuote1 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import {
    logger,
    quoteRepo,
    bulkQuoteRepo,
    messageProducer,
    participantService,
    accountLookupService,
    schemaRules,
} from "../../utils/mocked_variables";
import { QuotingAggregate } from "./../../../src/aggregate";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    createMessage,
    createQuoteRequestReceivedEvtPayload,
} from "../../utils/helpers";
import {
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
    QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent,
    QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload,
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
    QuoteRequestReceivedEvt,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { IQuoteSchemeRules } from "../../../src/types";

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
            errorDescription: "Message payload is null or undefined",
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
            errorDescription: "Message name is null or undefined",
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
    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId is null or undefined", async () => {
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
            errorDescription: "Payer fspId is null or undefined",
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

    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId is not found on participant service due to an error", async () => {
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
                errorDescription: `Payer participant not found for fspId: ${requesterFspId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId is not found on participant service", async () => {
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
                errorDescription: `Payer participant not found for fspId: ${requesterFspId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId mismatches the one found on participant service", async () => {
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
                errorDescription: `Payer participant fspId ${requesterFspId} mismatch with the one fetched from participant service ${fakeParticipantId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId is not active", async () => {
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
                errorDescription: `Payer participant fspId ${requesterFspId} is not active`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if requesterFspId is not approved", async () => {
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
                errorDescription: `Payer participant fspId ${requesterFspId} is not approved`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if schema validation is incorrect", async () => {
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
                errorDescription: `Quote request scheme validation failed for quoteId: ${mockedQuote.quoteId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId not provided and when trying to fetch it an error occurs", async () => {
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
            errorDescription: "Payee fspId is null or undefined",
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId not provided and when trying to fetch it returns null from service", async () => {
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
            errorDescription: "Payee fspId is null or undefined",
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId not found on participant service due to an error", async () => {
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
                errorDescription: `Payee participant not found for participantId: ${destinationFspId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId not found on participant service", async () => {
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
                errorDescription: `Payee participant not found for participantId: ${destinationFspId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId mismatches the one fetched on participant service", async () => {
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
                errorDescription: `Payee participant ${destinationFspId} id mismatch with expected ${mismatchDestinationFspId}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId is not approved", async () => {
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
                errorDescription: `Payee participant fspId ${destinationFspId} is not approved`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if destination fspId is not active", async () => {
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
                errorDescription: `Payee participant fspId ${destinationFspId} is not active`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if quote is expired", async () => {
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
            errorDescription: `Quote with id ${mockedQuote.quoteId} has expired at ${surpassedExpiration}`,
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

    test("handleQuoteRequestReceivedEvt - should send error event if couldnt store quote on passthrough mode", async () => {
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
            errorDescription: "Unable to add quote with to database",
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
});

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
