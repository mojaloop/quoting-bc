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
import { mockedQuote1, mockedQuote2, mockedQuote3, mockedQuote4 } from "@mojaloop/quoting-bc-shared-mocks-lib";
import {  MongoQuotesRepo, QuoteNotFoundError, QuoteAlreadyExistsError } from "../../../packages/implementations-lib/src";
import { QuoteStatus } from "../../../packages/domain-lib/src";
import { IQuote } from "@mojaloop/quoting-bc-domain-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017";
// const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://127.0.0.1:27017";
const COLLECTION_NAME = "quotes";

let mongoQuotesRepo : MongoQuotesRepo;

let mongoClient: MongoClient;
let collection : Collection;
const connectionString = `${CONNECTION_STRING}`;

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

        // Act
        await mongoQuotesRepo.addQuote(quote1);

        // Assert
        await expect(mongoQuotesRepo.addQuote(quote1)).rejects.toThrowError(QuoteAlreadyExistsError);

    });

    test("should insert multiple quotes in the database", async () => {
        // Arrange
        const quotes = [mockedQuote1, mockedQuote2, mockedQuote3, mockedQuote4];

        // Act
        await mongoQuotesRepo.addQuotes(quotes);

        // Assert
        const quote1 = await mongoQuotesRepo.getQuoteById(quotes[0].quoteId);
        const quote2 = await mongoQuotesRepo.getQuoteById(quotes[1].quoteId);
        const quote3 = await mongoQuotesRepo.getQuoteById(quotes[2].quoteId);
        const quote4 = await mongoQuotesRepo.getQuoteById(quotes[3].quoteId);

        expect(quote1).toBeDefined();
        expect(quote1).toEqual(quotes[0]);
        expect(quote2).toBeDefined();
        expect(quote2).toEqual(quotes[1]);
        expect(quote3).toBeDefined();
        expect(quote3).toEqual(quotes[2]);
        expect(quote4).toBeDefined();
        expect(quote4).toEqual(quotes[3]);

    });

    test("should throw error when trying to insert multiple quotes with an existing id", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const quote2 = mockedQuote2;
        const quote3 = mockedQuote3;
        const quote4 = mockedQuote4;
        quote4.quoteId = quote1.quoteId;
        await mongoQuotesRepo.addQuote(quote1);

        // Act && Assert
        await expect(mongoQuotesRepo.addQuotes([quote1, quote2, quote3, quote4])).rejects.toThrowError(QuoteAlreadyExistsError);

    });


    test("should throw an error when trying to update a quote that does not exist", async () => {
        // Arrange
        const quote1 = mockedQuote1;

        // Act && Assert
        await expect(mongoQuotesRepo.updateQuote(quote1)).rejects.toThrowError(QuoteNotFoundError);

    });

    test("should update a quote in the database", async () => {
        // Arrange
        const quote1 = deepCopy(mockedQuote1);
        const newQuote = deepCopy(mockedQuote2);
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
        const quote1 = deepCopy(mockedQuote1);
        const newPayee = {...mockedQuote2.payee};
        const newQuote = deepCopy(mockedQuote2);
        newQuote.payee = {...newPayee};
        newQuote.quoteId = quote1.quoteId;

        await mongoQuotesRepo.addQuote(quote1);

        // Act
        await mongoQuotesRepo.updateQuote(newQuote);

        // Assert
        const result = await mongoQuotesRepo.getQuoteById(newQuote.quoteId);
        expect(result).toBeDefined();
        expect(result?.payee).toEqual(newPayee);
    });

    test("should update a list of quotes in the database", async () => {
        // Arrange

        const quote1 = deepCopy(mockedQuote1);
        // Create a deep copy of the quote
        const quote2 = deepCopy(mockedQuote2);
        await mongoQuotesRepo.addQuotes([quote1, quote2]);

        const quoteWithNewValues: IQuote = deepCopy(mockedQuote3);
        quoteWithNewValues.quoteId = mockedQuote1.quoteId;
        quoteWithNewValues.condition = "should be updated condition";
        quoteWithNewValues.note = "should be updated note";
        quoteWithNewValues.amount.currency = "should be updated currency";

        const quoteWithNewValues2: IQuote =deepCopy(mockedQuote4);
        quoteWithNewValues2.quoteId = mockedQuote2.quoteId;
        quoteWithNewValues2.condition = "should be updated condition 2";
        quoteWithNewValues2.note = "should be updated note 2";
        quoteWithNewValues2.amount.currency = "should be updated currency 2";

        const newQuotesArray = [quoteWithNewValues, quoteWithNewValues2];

        // Act
        await mongoQuotesRepo.updateQuotes(newQuotesArray);

        // Assert
        const result = await mongoQuotesRepo.getQuoteById(quote1.quoteId);
        const result2 = await mongoQuotesRepo.getQuoteById(quote2.quoteId);
        expect(result?.condition).toEqual("should be updated condition");
        expect(result?.note).toEqual("should be updated note");
        expect(result?.amount.currency).toEqual("should be updated currency");

        expect(result2?.condition).toEqual("should be updated condition 2");
        expect(result2?.note).toEqual("should be updated note 2");
        expect(result2?.amount.currency).toEqual("should be updated currency 2");
    });



    test("should return null when a quote that does not exist", async () => {
        // Arrange
        const quote1 = mockedQuote1;

        // Act
        const result = await mongoQuotesRepo.getQuoteById("non existing id");

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
        await expect(mongoQuotesRepo.removeQuote(quote1.quoteId)).rejects.toThrowError(QuoteNotFoundError);

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

    test("should get a list of quotes by bulk quote identifier", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const bulkQuoteId = quote1.bulkQuoteId as string;

        const quote2 = mockedQuote2;
        const quote3 = mockedQuote3;
        const quote4 = mockedQuote4;
        quote2.bulkQuoteId = quote1.bulkQuoteId;
        quote3.bulkQuoteId = quote1.bulkQuoteId;
        quote4.bulkQuoteId = quote1.bulkQuoteId;

        await mongoQuotesRepo.addQuotes([quote1, quote2, quote3, quote4]);

        // Act
        const result = await mongoQuotesRepo.getQuotesByBulkQuoteId(bulkQuoteId);

        // Assert
        expect(result).toBeDefined();
        expect(result).toHaveLength(4);
        expect(result).toEqual([quote1,quote2, quote3, quote4]);

    });

    test("should return a empty array when there are no quotes", async () => {
         // Act
         const result = await mongoQuotesRepo.getQuotes();

         // Assert
         expect(result).toBeDefined();
         expect(result).toEqual([]);
    });

    test("should return a list of quotes", async () => {
        // Arrange
        const quote1 = mockedQuote1;
        const quote2 = mockedQuote2;
        const quote3 = mockedQuote3;
        const quote4 = mockedQuote4;
        await mongoQuotesRepo.addQuotes([quote1, quote2, quote3, quote4]);

        // Act
        const result = await mongoQuotesRepo.getQuotes();

        // Assert
        expect(result).toBeDefined();
        expect(result).toHaveLength(4);
        expect(result).toEqual([quote1, quote2, quote3, quote4]);
    });
 });

 const deepCopy = (obj: Object) => JSON.parse(JSON.stringify(obj));


