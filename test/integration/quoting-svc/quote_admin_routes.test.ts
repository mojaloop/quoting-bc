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

import request from "supertest";
import {MemoryAccountLookupService, MemoryBulkQuoteRepo, MemoryMessageConsumer, MemoryMessageProducer, MemoryParticipantService, MemoryQuoteRepo, mockedBulkQuote1, mockedQuote1, mockedQuote2, mockedQuote3} from "@mojaloop/quoting-shared-mocks";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start, stop } from "@mojaloop/quoting-bc-quoting-svc";
import { IAccountLookupService, IBulkQuoteRepo, IParticipantService, IQuoteRepo } from "@mojaloop/quoting-bc-domain";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedAccountLookupService: IAccountLookupService = new MemoryAccountLookupService(logger);

const mockedQuoteRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

const mockedBulkQuoteRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const server = (process.env["QUOTING_ADMIN_URL"] || "http://localhost:3035");

describe("Quoting Admin Routes - Integration", () => {

    beforeAll(async () => {
        await start(logger,mockedConsumer,mockedProducer, mockedQuoteRepository,mockedBulkQuoteRepository, mockedParticipantService, mockedAccountLookupService);
    });

    afterAll(async () => {
        await stop();
    });

    test("GET - should get a quote by it's id", async () => {
        // Arrange
        const newQuote = mockedQuote1;
        mockedQuoteRepository.addQuote(newQuote);
        const quoteId = newQuote.quoteId;

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(newQuote);
    });

    test("GET - should get a list of quotes", async () => {
        // Arrange
        mockedQuoteRepository.addQuote(mockedQuote1);
        mockedQuoteRepository.addQuote(mockedQuote2);
        mockedQuoteRepository.addQuote(mockedQuote3);

        // Act
        const response = await request(server)
            .get("/quotes");

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual([mockedQuote1, mockedQuote2, mockedQuote3]);
    });

    test("GET - should get a bulk quote by it's id", async () => {
        // Arrange
        mockedBulkQuoteRepository.addBulkQuote(mockedBulkQuote1);

        const bulkQuoteId = mockedBulkQuote1.bulkQuoteId;

        // Act
        const response = await request(server)
            .get(`/bulkQuotes/${bulkQuoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedBulkQuote1);
    });

    test("GET - should get a list of bulk quotes", async () => {
        // Arrange
        mockedBulkQuoteRepository.addBulkQuote(mockedBulkQuote1);

        // Act
        const response = await request(server)
            .get("/bulkQuotes");

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual([mockedBulkQuote1]);
    });

});

