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
 
import { MongoClient } from "mongodb";
import { MongoQuotesRepo } from "../../../src/quotes/mongo_quotes_repo";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { 
    QuoteAlreadyExistsError,
    QuoteNotFoundError,
    UnableToAddManyQuotesError,
    UnableToAddQuoteError,
    UnableToBulkInsertQuotesError,
    UnableToCloseDatabaseConnectionError,
    UnableToDeleteQuoteError,
    UnableToGetQuoteError,
    UnableToGetQuotesError,
    UnableToInitQuoteRegistryError,
    UnableToSearchQuotes,
    UnableToUpdateQuoteError 
} from "../../../src/errors";
import { IQuote, QuotingSearchResults } from "@mojaloop/quoting-bc-public-types-lib";
import { mockedQuote1, mockedQuote2 } from "@mojaloop/quoting-bc-shared-mocks-lib";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);


const mongoConnectSpy = jest.fn();
const mongoCloseSpy = jest.fn();
const mongoFindOneSpy = jest.fn();
const mongoInsertOneSpy = jest.fn();
const mongoInsertManySpy = jest.fn();
const mongoBulkWriteSpy = jest.fn();
const mongoUpdateOneSpy = jest.fn();
const mongoDeleteOneSpy = jest.fn();
const mongoToArraySpy = jest.fn();
const mongoFindSpy = jest.fn().mockImplementation(() => ({
    toArray: mongoToArraySpy,
}))
const mongoCountDocumentsSpy = jest.fn();
const mongoAggregateSpy = jest.fn();

const mongoCollectionSpy = jest.fn().mockImplementation(() => ({
    findOne: mongoFindOneSpy,
    insertOne: mongoInsertOneSpy,
    insertMany: mongoInsertManySpy,
    bulkWrite: mongoBulkWriteSpy,
    updateOne: mongoUpdateOneSpy,
    deleteOne: mongoDeleteOneSpy,
    find: mongoFindSpy,
    countDocuments: mongoCountDocumentsSpy,
    aggregate: mongoAggregateSpy,
}));

const mongoToArrayListCollectionsSpy = jest.fn().mockImplementation(() => {
    return []
})

const mongoListCollectionsSpy = jest.fn().mockImplementation(() => ({
    findOne: mongoFindOneSpy,
    insertOne: mongoInsertOneSpy,
    insertMany: mongoInsertManySpy,
    bulkWrite: mongoBulkWriteSpy,
    updateOne: mongoUpdateOneSpy,
    deleteOne: mongoDeleteOneSpy,
    find: mongoFindSpy,
    toArray: mongoToArrayListCollectionsSpy,
    countDocuments: mongoCountDocumentsSpy,
    aggregate: mongoAggregateSpy,
}));



jest.mock('mongodb', () => {
    const mockCollection = jest.fn().mockImplementation(() => ({
        findOne: mongoFindOneSpy
    }));

    return {
        MongoClient: jest.fn().mockImplementation(() => ({
            connect: mongoConnectSpy,
            close: mongoCloseSpy,
            db: jest.fn().mockImplementation(() => ({
                collection: mongoCollectionSpy,
                listCollections: mongoListCollectionsSpy
            })),
        })),
        Collection: mockCollection,
    };
});

const redisSetSpy = jest.fn();
const redisSetExSpy = jest.fn();
const redisMultiExecSpy = jest.fn();
const redisGetSpy = jest.fn();

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => {
        return {
            connect: jest.fn(),
            set: redisSetSpy,
            setex: redisSetExSpy,
            multi: jest.fn().mockImplementation(() => {
                return {
                    exec: redisMultiExecSpy
                }
            }),
            get: redisGetSpy,
        };
    });
});
  
const connectionString = 'mongodb://localhost:27017';
const redisHost = "redishost";
const redisPort = 1234;
const dbName = "quotes";

describe("Implementations - Mongo Quotes Repo Unit Tests", () => {
    let mongoQuotesRepo: MongoQuotesRepo;

    beforeEach(async () => {
        jest.clearAllMocks();

        mongoToArrayListCollectionsSpy.mockResolvedValue([
            { name: dbName },
        ]);

        mongoQuotesRepo = new MongoQuotesRepo(logger, connectionString, redisHost, redisPort);

        await mongoQuotesRepo.init();

    });

    it('should initialize the MongoDB connection and quotes collection', async () => {
        // Act 
        await mongoQuotesRepo.init();

        // Assert
        expect(MongoClient).toHaveBeenCalledWith(connectionString);
        expect(mongoCollectionSpy).toHaveBeenCalledWith('quotes');
    });

    it('should close the database connection', async () => {
        // Act
        await mongoQuotesRepo.destroy();

        // Assert
        expect(mongoCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw UnableToCloseDatabaseConnectionError when encountering an error during closing', async () => {
        // Arrange
        const errorMessage = 'Closing error';

        mongoCloseSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.destroy()).rejects.toThrow(UnableToCloseDatabaseConnectionError);

    });

    it('should throw an error if unable to connect to the database', async () => {
        // Arrange
        mongoConnectSpy.mockImplementationOnce(() => { throw new Error(); })

        // Act & Assert
        await expect(mongoQuotesRepo.init()).rejects.toThrow(UnableToInitQuoteRegistryError);
    });

    it('should store quotes successfully', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1,
            mockedQuote2
        ];

        const bulkWriteResult = {
            upsertedCount: quotes.length,
            modifiedCount: 0,
        };

        mongoBulkWriteSpy.mockResolvedValueOnce(bulkWriteResult);

        // Act
        await mongoQuotesRepo.storeQuotes(quotes);

        const expectedOperations = quotes.map((quote) => ({
            replaceOne: {
                filter: { quoteId: quote.quoteId },
                replacement: quote,
                upsert: true,
            },
        }));

        // Assert
        expect(mongoBulkWriteSpy).toHaveBeenCalledWith(expectedOperations);
    });

    it('should throw UnableToStoreQuotesError when encountering an error during storage', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1
        ];

        const errorMessage = 'Storage error';
        mongoBulkWriteSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.storeQuotes(quotes)).rejects.toThrow(UnableToBulkInsertQuotesError);

        expect(mongoBulkWriteSpy).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should throw UnableToStoreQuotesError when the number of responses does not match the number of quotes', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1
        ];

        const bulkWriteResult = {
            upsertedCount: 2,
            modifiedCount: 0,
        };

        mongoBulkWriteSpy.mockResolvedValueOnce(bulkWriteResult);

        // Act & Assert
        await expect(mongoQuotesRepo.storeQuotes(quotes)).rejects.toThrow(UnableToBulkInsertQuotesError);

        expect(mongoBulkWriteSpy).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return the quote when it exists', async () => {
        // Arrange
        const quoteId = '123';

        const quoteData = mockedQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(quoteData);

        // Act
        const quote = await mongoQuotesRepo.getQuoteById(quoteId);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId });
        expect(quote).toEqual(quoteData);
    });

    it('should return null when the quote does not exist', async () => {
        // Arrange
        const quoteId = '123';

        mongoFindOneSpy.mockResolvedValueOnce(null);

        // Act
        const quote = await mongoQuotesRepo.getQuoteById(quoteId);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId });
        expect(quote).toBeNull();
    });

    it('should throw UnableToGetQuoteError when encountering an error during retrieval', async () => {
        // Arrange
        const quoteId = '123';

        const errorMessage = 'Retrieval error';
        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.getQuoteById(quoteId)).rejects.toThrow(UnableToGetQuoteError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId });
    });

    it('should return quotes when they exist for a given bulk quote ID', async () => {
        // Arrange
        const bulkQuoteId = 'bulk123';

        const quote1 = {
            ...mockedQuote1,
            bulkQuoteId,
        };

        const quote2 = {
            ...mockedQuote2,
            bulkQuoteId,
        };

        const quotesData = [quote1, quote2];

        mongoToArraySpy.mockResolvedValueOnce(quotesData);

        // Act
        const quotes = await mongoQuotesRepo.getQuotesByBulkQuoteId(bulkQuoteId);

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(quotes).toEqual(quotesData);
    });

    it('should throw UnableToGetQuotesError when encountering an error during retrieval', async () => {
        // Arrange
        const bulkQuoteId = 'bulk123';

        const errorMessage = 'Retrieval error';
        mongoToArraySpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act
        await expect(mongoQuotesRepo.getQuotesByBulkQuoteId(bulkQuoteId)).rejects.toThrow(UnableToGetQuotesError);

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledWith({ bulkQuoteId });
    });

    it('should construct the filter object correctly based on provided parameters', async () => {
        // Arrange
        const quotesData = [
            mockedQuote1,
            mockedQuote2,
        ];

        const countResult = 2;

        const searchResults: QuotingSearchResults = {
            pageSize: 100,
            pageIndex: 0,
            totalPages: 1,
            items: quotesData,
        };

        mongoFindSpy.mockReturnValueOnce({
            toArray: jest.fn().mockResolvedValueOnce(quotesData),
        });

        mongoCountDocumentsSpy.mockResolvedValueOnce(countResult);

        // Act
        const result = await mongoQuotesRepo.searchQuotes('type1', 'scenario1', 'quote123', 'trans123', 'bulk123');

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledWith({
            $and: [
                { quoteId: { $regex: 'quote123', $options: 'i' } },
                { transactionId: { $regex: 'trans123', $options: 'i' } },
                { amountType: 'type1' },
                { 'transactionType.scenario': 'scenario1' },
                { bulkQuoteId: { $regex: 'bulk123', $options: 'i' } },
            ],
        },{
            limit: 100, 
            projection: {"_id": 0}, 
            skip: 0, 
            sort: [
                "updatedAt", "desc"
            ]
        });

        expect(mongoCountDocumentsSpy).toHaveBeenCalledWith({
            $and: [
                { quoteId: { $regex: 'quote123', $options: 'i' } },
                { transactionId: { $regex: 'trans123', $options: 'i' } },
                { amountType: 'type1' },
                { 'transactionType.scenario': 'scenario1' },
                { bulkQuoteId: { $regex: 'bulk123', $options: 'i' } },
            ],
        });

        expect(result).toEqual(searchResults);
    });

    it('should handle errors during search operation', async () => {
        // Arrange
        const errorMessage = 'Search error';

        mongoFindSpy.mockReturnValueOnce({
            toArray: jest.fn().mockRejectedValueOnce(new Error(errorMessage)),
        });

        // Act & Assert
        await expect(mongoQuotesRepo.searchQuotes(null, null, null, null, null, 0, 10)).rejects.toThrow(UnableToSearchQuotes);
    });

    it('should return distinct search keywords for different fields', async () => {
        // Arrange
        const amountTypeResult = {
            _id: { amountType: 'type1', transactionType: 'typeA' },
        };

        const transactionTypeResult = {
            _id: { amountType: 'type2', transactionType: { scenario: 'typeB' } },
        };

        mongoAggregateSpy.mockReturnValueOnce({
            [Symbol.asyncIterator]: jest.fn(() => ({
                next: jest.fn()
                    .mockResolvedValueOnce({ value: amountTypeResult, done: false })
                    .mockResolvedValueOnce({ done: true }), 
            })),
        });

        mongoAggregateSpy.mockReturnValueOnce({
            [Symbol.asyncIterator]: jest.fn(() => ({
                next: jest.fn()
                    .mockResolvedValueOnce({ value: transactionTypeResult, done: false })
                    .mockResolvedValueOnce({ done: true }), 
            })),
        });

        const expectedResponse = [
            { fieldName: 'amountType', distinctTerms: ['type1'] },
            { fieldName: 'transactionType', distinctTerms: [undefined] },
        ];

        // Act
        const result = await mongoQuotesRepo.getSearchKeywords();

        // Assert
        expect(result).toEqual(expectedResponse);
    });

});