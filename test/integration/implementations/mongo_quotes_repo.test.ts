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

import { ILogger,ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {  MongoQuotesRepo, NoSuchQuoteError, QuoteAlreadyExistsError } from "@mojaloop/quoting-bc-implementations";
//  import { NoSuchOracleError, Oracle } from "@mojaloop/quoting-bc-domain";
import { MongoClient, Collection } from "mongodb";
import { mockedQuote1, mockedQuote2, mockedQuote3, mockedQuote4 } from "@mojaloop/quoting-shared-mocks";
import { NonExistingQuoteError } from "@mojaloop/quoting-bc-domain";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);
 
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
//const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://localhost:27017/";
const COLLECTION_NAME = "quotes";
 
let mongoQuotesRepo : MongoQuotesRepo;
 
let mongoClient: MongoClient;
let collection : Collection;
const connectionString = `${CONNECTION_STRING}/${DB_NAME}`;
 
describe("Implementations - Mongo Quotes Repo Integration tests", () => {
 
    beforeAll(async () => {
        mongoClient = await MongoClient.connect(connectionString);
        collection = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);
        mongoQuotesRepo = new MongoQuotesRepo(logger, CONNECTION_STRING, DB_NAME);
        await mongoQuotesRepo.init();
        await collection.deleteMany({});
    });
 
    afterEach(async () => {
        await collection.deleteMany({});

    });
 
    afterAll(async () => {
        await collection.deleteMany({});
        await mongoQuotesRepo.destroy();
        await mongoClient.close();
    });
 
    test("should be able to init mongo quotes repo", async () => {
        expect(mongoQuotesRepo).toBeDefined();
    });
 
    test("should throw error when is unable to init quotes repo", async () => {
        // Arrange
        const badMongoRepository = new MongoQuotesRepo(logger, "invalid connection", "invalid_db_name");
         
        // Act
        await expect(badMongoRepository.init()).rejects.toThrowError();
 
    });
 
    test("should throw error when is unable to destroy mongo quote repo", async () => {
        // Arrange
        const badMongoRepository = new MongoQuotesRepo(logger, "invalid connection", "invalid_db_name");
         
        // Act
        await expect(badMongoRepository.destroy()).rejects.toThrowError();
    });
 
    test("should insert a quote in the database", async () => {
        // Arrange
        const quote1 = mockedQuote1;
 
        // Act
        const quoteId = await mongoQuotesRepo.addQuote(quote1);

        // Assert
        expect(quoteId).toBeDefined();
        expect(quoteId).toEqual(quote1.quoteId);
         
    });

    test("should throw error when trying to insert a quote with an existing id", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const quote2 = mockedQuote2;

        // Act
        await mongoQuotesRepo.addQuote(quote1);

        // Assert
        await expect(mongoQuotesRepo.addQuote(quote1)).rejects.toThrowError(QuoteAlreadyExistsError);

    });

    test("should throw an error when trying to update a quote that does not exist", async () => {
        // Arrange
        const quote1 = mockedQuote1;

        // Act && Assert
        await expect(mongoQuotesRepo.updateQuote(quote1)).rejects.toThrowError(NonExistingQuoteError);

    });

    test("should update a quote in the database", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const newQuote = mockedQuote2;
        await mongoQuotesRepo.addQuote(quote1);
        newQuote.quoteId = quote1.quoteId;
        
        // Act
        await mongoQuotesRepo.updateQuote(newQuote);

        // Assert
        const result = await mongoQuotesRepo.getQuoteById(newQuote.quoteId);
        expect(result).toBeDefined();
        expect(result).toEqual(newQuote);
    });

    test("should update a quote partially in the database", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const newPayee = mockedQuote2.payee;
        const newQuote = mockedQuote2;
        newQuote.payee = newPayee;

        await mongoQuotesRepo.addQuote(quote1);
        
        // Act
        await mongoQuotesRepo.updateQuote(newQuote);

        // Assert
        const result = await mongoQuotesRepo.getQuoteById(newQuote.quoteId);
        expect(result).toBeDefined();
        expect(result?.payee).toEqual(newPayee);
    });

    test("should return null when a quote that does not exist", async () => {
        // Arrange
        const quote1 = mockedQuote1;

        // Act
        const result = await mongoQuotesRepo.getQuoteById(quote1.quoteId);

        // Assert
        expect(result).toBeNull();
    });

    test("should return a quote when it exists", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        await mongoQuotesRepo.addQuote(quote1);

        // Act
        const result = await mongoQuotesRepo.getQuoteById(quote1.quoteId);

        // Assert
        expect(result).toBeDefined();
        expect(result).toEqual(quote1);
    });

    test("should throw error when trying to delete a quote that does not exist", async () => {
        // Arrange
        const quote1 = mockedQuote1;

        // Act && Assert
        await expect(mongoQuotesRepo.removeQuote(quote1.quoteId)).rejects.toThrowError(NoSuchQuoteError);

    });

    test("should delete a quote in the database", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        await mongoQuotesRepo.addQuote(quote1);

        // Act
        await mongoQuotesRepo.removeQuote(quote1.quoteId);

        // Assert
        const result = await mongoQuotesRepo.getQuoteById(quote1.quoteId);
        expect(result).toBeNull();
    });
     
 });
 
 
 
 