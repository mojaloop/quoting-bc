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
import { MongoClient, Collection } from "mongodb";
import { mockedBulkQuote1, mockedBulkQuote2 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { BulkQuoteAlreadyExistsError, BulkQuoteNotFoundError, MongoBulkQuotesRepo } from "../../../packages/Implementations-lib/src";
import { IBulkQuote, IBulkQuoteRepo } from "../../../packages/domain-lib/src";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
//const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://127.0.0.1:27017/";
const COLLECTION_NAME = "bulk_quotes";

let mongoBulkQuotesRepo : IBulkQuoteRepo;

let mongoClient: MongoClient;
let collection : Collection;
const connectionString = `${CONNECTION_STRING}/${DB_NAME}`;

describe("Implementations - Mongo Bulk Quotes Repo Integration tests", () => {

    beforeAll(async () => {
        mongoClient = await MongoClient.connect(connectionString);
        collection = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);
        mongoBulkQuotesRepo = new MongoBulkQuotesRepo(logger, CONNECTION_STRING, DB_NAME);
        await mongoBulkQuotesRepo.init();
        await collection.deleteMany({});
    });

    afterEach(async () => {
        await collection.deleteMany({});

    });

    afterAll(async () => {
        await collection.deleteMany({});
        await mongoBulkQuotesRepo.destroy();
        await mongoClient.close();
    });

    test("should be able to init mongo bulk quotes repo", async () => {
        expect(mongoBulkQuotesRepo).toBeDefined();
    });

    test("should throw error when is unable to init bulk quotes repo", async () => {
        // Arrange
        const badMongoRepository = new MongoBulkQuotesRepo(logger, "invalid connection", "invalid_db_name");

        // Act
        await expect(badMongoRepository.init()).rejects.toThrowError();

    });

    test("should throw error when is unable to destroy mongo quote repo", async () => {
        // Arrange
        const badMongoRepository = new MongoBulkQuotesRepo(logger, "invalid connection", "invalid_db_name");

        // Act
        await expect(badMongoRepository.destroy()).rejects.toThrowError();
    });

    test("should insert a bulk quote in the database", async () => {
        // Arrange
        const bulkQuote1: IBulkQuote = mockedBulkQuote1;

        // Act
        const bulkQuoteId = await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);

        // Assert
        expect(bulkQuoteId).toBeDefined();
        expect(bulkQuoteId).toEqual(bulkQuote1.bulkQuoteId);

    });

    test("should throw error when trying to insert a bulk quote with an existing id", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;

        // Act
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);

        // Assert
        await expect(mongoBulkQuotesRepo.addBulkQuote(bulkQuote1)).rejects.toThrowError(BulkQuoteAlreadyExistsError);

    });

    test("should throw an error when trying to update a bulk quote that does not exist", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;

        // Act && Assert
        await expect(mongoBulkQuotesRepo.updateBulkQuote(bulkQuote1)).rejects.toThrowError(BulkQuoteNotFoundError);

    });

    test("should update a bulk quote in the database", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;
        const newBulkQuote = mockedBulkQuote2;
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);
        newBulkQuote.bulkQuoteId = bulkQuote1.bulkQuoteId;

        // Act
        await mongoBulkQuotesRepo.updateBulkQuote(newBulkQuote);

        // Assert
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(newBulkQuote.bulkQuoteId);
        expect(result).toBeDefined();
        expect(result).toEqual(newBulkQuote);
    });

    test("should update a bulk quote partially in the database", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;
        const newPayer = mockedBulkQuote2.payer;
        const newBulkQuote = mockedBulkQuote2;
        newBulkQuote.payer = newPayer;

        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);

        // Act
        await mongoBulkQuotesRepo.updateBulkQuote(newBulkQuote);

        // Assert
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(newBulkQuote.bulkQuoteId);
        expect(result).toBeDefined();
        expect(result?.payer).toEqual(newPayer);
    });

    test("should return null when a bulk quote that does not exist", async () => {

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuoteById("invalid_id");

        // Assert
        expect(result).toBeNull();
    });

    test("should return a bulk quote when it exists", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(bulkQuote1.bulkQuoteId);

        // Assert
        expect(result).toBeDefined();
        expect(result).toEqual(bulkQuote1);
    });

    test("should throw error when trying to delete a bulk quote that does not exist", async () => {

        // Act && Assert
        await expect(mongoBulkQuotesRepo.removeBulkQuote("invalid_id")).rejects.toThrowError(BulkQuoteNotFoundError);

    });

    test("should delete a quote in the database", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);

        // Act
        await mongoBulkQuotesRepo.removeBulkQuote(bulkQuote1.bulkQuoteId);

        // Assert
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(bulkQuote1.bulkQuoteId);
        expect(result).toBeNull();
    });

    test("should return empty array when there are no bulk quotes", async () => {
        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuotes();

        // Assert
        expect(result).toBeDefined();
        expect(result).toEqual([]);
    });

    test("should return all bulk quotes in the database", async () => {
        // Arrange
        const bulkQuote1 = mockedBulkQuote1;
        const bulkQuote2 = mockedBulkQuote2;
        bulkQuote2.bulkQuoteId = "bulk_quote_2";
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote1);
        await mongoBulkQuotesRepo.addBulkQuote(bulkQuote2);

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuotes();

        // Assert
        expect(result).toBeDefined();
        expect(result).toEqual([bulkQuote1, bulkQuote2]);
    });

 });