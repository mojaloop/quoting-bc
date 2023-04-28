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
import { MemoryAccountLookupService, MemoryBulkQuoteRepo, MemoryMessageConsumer, MemoryMessageProducer, MemoryParticipantService, MemoryQuoteRepo, mockedBulkQuote1, mockedQuote1, mockedQuote2, mockedQuote3 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAccountLookupService, IBulkQuoteRepo, IParticipantService, IQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { MemoryAuthenticatedHttpRequesterMock } from '@mojaloop/quoting-bc-shared-mocks-lib';
import {IAuthenticatedHttpRequester} from "@mojaloop/security-bc-client-lib";
import {Service} from "@mojaloop/quoting-bc-quoting-svc";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantService = new MemoryParticipantService(logger);

const mockedAccountLookupService: IAccountLookupService = new MemoryAccountLookupService(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger,"fake token");

let mockedQuoteRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

let mockedBulkQuoteRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const server = (process.env["QUOTING_ADM_URL"] || "http://localhost:3033");

describe("Quoting Admin Routes - Integration", () => {

    beforeAll(async () => {
        await Service.start(logger, mockedConsumer, mockedProducer, mockedQuoteRepository, mockedBulkQuoteRepository,mockedAuthRequester, mockedParticipantService, mockedAccountLookupService);
    });

    afterEach(async () => {
        const quotes = await mockedQuoteRepository.getQuotes();
        for await (const quote of quotes) {
            await mockedQuoteRepository.removeQuote(quote.quoteId);
        }

        const bulkQuotes = await mockedBulkQuoteRepository.getBulkQuotes();
        for await (const bulkQuote of bulkQuotes) {
            await mockedBulkQuoteRepository.removeBulkQuote(bulkQuote.bulkQuoteId);
        }
    });


    afterAll(async () => {
        await Service.stop();
    });

    test("GET - should get a quote by it's id", async () => {
        // Arrange
        const newQuote = mockedQuote1;
        const quoteId = await mockedQuoteRepository.addQuote(newQuote);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(newQuote);

    });

    test("GET - should get a list of quotes", async () => {
        // Arrange
        await mockedQuoteRepository.addQuote(mockedQuote1);
        await mockedQuoteRepository.addQuote(mockedQuote2);
        await mockedQuoteRepository.addQuote(mockedQuote3);

        // Act
        const response = await request(server)
            .get("/quotes");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body[0]).toEqual(mockedQuote1);
        expect(response.body[1]).toEqual(mockedQuote2);
        expect(response.body[2]).toEqual(mockedQuote3);
        expect(response.body.length).toBe(3);

    });

    test("GET - should get a quote by transactionId", async () => {
        // Arrange
        const newQuote = mockedQuote1;
        const quoteId = await mockedQuoteRepository.addQuote(newQuote);
        const quoteInfo = await mockedQuoteRepository.getQuoteById(quoteId);
        
        // Act
        const response = await request(server)
            .get(`/quotes?transactionId=${quoteInfo?.transactionId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(newQuote);

    });

    test("GET - should get a bulk quote by it's id", async () => {
        // Arrange
        const bulkQuoteId = await mockedBulkQuoteRepository.addBulkQuote(mockedBulkQuote1);

        // Act
        const response = await request(server)
            .get(`/bulk-quotes/${bulkQuoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockedBulkQuote1);
    });

    test("GET - should get a list of bulk quotes", async () => {
        // Arrange
        await mockedBulkQuoteRepository.addBulkQuote(mockedBulkQuote1);

        // Act
        const response = await request(server)
            .get("/bulk-quotes");

        // Assert
        expect(response.status).toBe(200);
        // expect(response.body[0]).toEqual(mockedBulkQuote1);
        expect(response.body.length).toBe(1);
    });

});

