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

import { IParticipant } from '@mojaloop/participant-bc-public-types-lib';
import { IMessage, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { QuoteRequestReceivedEvtPayload, QuoteResponseReceivedEvt } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { mockedQuote1 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { InvalidMessagePayloadError, InvalidMessageTypeError } from "../../src/errors";
import { createMessage, createQuoteRequestReceivedEvtPayload } from "../utils/helpers";
import { logger, bulkQuoteRepo, accountLookupService, messageProducer, quoteRepo, participantService, schemaRules } from "../utils/mocked_variables";
import { QuotingAggregate } from "../../src/aggregate";

let aggregate: QuotingAggregate;

describe("Domain - Unit Tests for Event Handler", () => {

    beforeAll(async () => {
        aggregate = new QuotingAggregate(logger,quoteRepo,bulkQuoteRepo,messageProducer,participantService,accountLookupService, false, schemaRules);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    // test("should publish error message if payload is invalid", async () => {
    //     // Arrange
    //     const message: IMessage = createMessage(null, "fake msg name", null);

    //     const errorMsg = InvalidMessagePayloadError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
    //         sourceEvent : "fake msg name",
    //         quoteId: undefined as unknown as string,
    //         destinationFspId: null,
    //         requesterFspId: null,
	// 	};

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //        }));

    // });

    // test("should publish error message if message Name is invalid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;

    //     const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

    //     const message: IMessage = createMessage(payload, "fake msg name", null);

    //     const errorMsg = InvalidMessageTypeError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		destinationFspId: null,
    //         requesterFspId: null,
    //         quoteId: payload.quoteId,
    //         sourceEvent : "fake msg name",
	// 	};

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //        }));

    // });

    // test("should publish error message if message Type is invalid", async () => {
    //     // Arrange
    //     const mockedQuote = mockedQuote1;

    //     const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

    //     const message: IMessage = {
    //         fspiopOpaqueState: "fake opaque state",
    //         msgId: "fake msg id",
    //         msgKey: "fake msg key",
    //         msgTopic: "fake msg topic",
    //         msgName: "fake msg name",
    //         msgOffset: 0,
    //         msgPartition: 0,
    //         msgTimestamp: 0,
    //         msgType: "invalid message type" as unknown as MessageTypes.DOMAIN_EVENT,
    //         payload :payload,
    //     };

    //     const errorMsg = InvalidMessageTypeError.name;

    //     const errorPayload: QuoteErrorEvtPayload = {
	// 		errorMsg,
	// 		destinationFspId: null,
    //         requesterFspId: null,
    //         quoteId: payload.quoteId,
    //         sourceEvent : "fake msg name",
	// 	};

    //     jest.spyOn(messageProducer, "send");

    //     // Act
    //     await aggregate.handleQuotingEvent(message);

    //     // Assert
    //     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
    //         "payload": errorPayload,
    //        }));

    // });

    test("should publish opaque state when publishing error event", async () => {
        const mockedQuote = mockedQuote1;

        const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const fspiopOpaqueState = {
            "state": "fake opaque state",
        }

        const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
        }));

    });

    test("should publish opaque state when publishing successful event", async () => {
        // Arrange
        const mockedQuote = mockedQuote1;
        const payload:QuoteRequestReceivedEvtPayload = createQuoteRequestReceivedEvtPayload(mockedQuote);

        const requesterFspId = "payer";
        const destinationFspId = "payee";
        const fspiopOpaqueState = {
            requesterFspId,
            destinationFspId,
        };

        const message: IMessage = createMessage(payload, QuoteResponseReceivedEvt.name,fspiopOpaqueState);

        jest.spyOn(quoteRepo, "addQuote")
            .mockResolvedValueOnce("inserted quote id");

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true} as IParticipant)
            .mockResolvedValueOnce({ id: destinationFspId, type: "DFSP", isActive: true} as IParticipant);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleQuotingEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": fspiopOpaqueState,
           }));
    });

});
