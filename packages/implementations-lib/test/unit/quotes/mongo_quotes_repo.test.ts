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

jest.mock('mongodb', () => {
    const mockCollection = jest.fn().mockImplementation(() => ({
        findOne: mongoFindOneSpy
    }));

    return {
        MongoClient: jest.fn().mockImplementation(() => ({
            connect: mongoConnectSpy,
            close: mongoCloseSpy,
            db: jest.fn().mockImplementation(() => ({
                collection: mongoCollectionSpy
            })),
        })),
        Collection: mockCollection,
    };
});
 
  
const connectionString = 'mongodb://localhost:27017';
const dbName = 'testDB';

describe("Implementations - Mongo Quotes Repo Unit Tests", () => {
    let mongoQuotesRepo: MongoQuotesRepo;

    beforeEach(async () => {
        jest.clearAllMocks();

        mongoQuotesRepo = new MongoQuotesRepo(logger, connectionString, dbName);

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

    it('should add a new quote successfully', async () => {
        // Arrange
        const quote = mockedQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(null);
        mongoInsertOneSpy.mockResolvedValueOnce({});

        // Act
        const addedQuoteId = await mongoQuotesRepo.addQuote(quote);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId: mockedQuote1.quoteId });
        expect(mongoInsertOneSpy).toHaveBeenCalledWith(quote);
        expect(addedQuoteId).toBe(mockedQuote1.quoteId);
    });

    it('should throw QuoteAlreadyExistsError when attempting to add an existing quote', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        mongoFindOneSpy.mockResolvedValueOnce({});

        // Act
        await expect(mongoQuotesRepo.addQuote(quote)).rejects.toThrow(QuoteAlreadyExistsError);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId: quote.quoteId });
        expect(mongoInsertOneSpy).not.toHaveBeenCalled();
    });

    it('should throw UnableToAddQuoteError when encountering an error during insertion', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        const errorMessage = 'Insertion error';
        mongoFindOneSpy.mockResolvedValueOnce(null);
        mongoInsertOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.addQuote(quote)).rejects.toThrow(UnableToAddQuoteError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId: quote.quoteId });
        expect(mongoInsertOneSpy).toHaveBeenCalledWith(quote);
    });

    it('should throw UnableToGetQuoteError when encountering an error while checking if quote exists', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        const errorMessage = 'Find error';
        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.addQuote(quote)).rejects.toThrow(UnableToGetQuoteError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ quoteId: quote.quoteId });
        expect(mongoInsertOneSpy).not.toHaveBeenCalled();
    });

    it('should add multiple quotes successfully', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1,
            mockedQuote2,
        ];

        mongoFindOneSpy.mockResolvedValue(null);
        mongoInsertManySpy.mockResolvedValueOnce({});

        // Act
        await mongoQuotesRepo.addQuotes(quotes);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledTimes(quotes.length);
        expect(mongoInsertManySpy).toHaveBeenCalledWith(quotes);
    });

    it('should throw QuoteAlreadyExistsError when attempting to add quotes with existing IDs', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1,
            mockedQuote2,
        ];

        mongoFindOneSpy.mockResolvedValueOnce({}); 

        // Act & Assert
        await expect(mongoQuotesRepo.addQuotes(quotes)).rejects.toThrow(QuoteAlreadyExistsError);

        expect(mongoFindOneSpy).toHaveBeenCalledTimes(1);
        expect(mongoInsertManySpy).not.toHaveBeenCalled();
    });

    it('should add quotes with generated IDs for quotes without quoteId', async () => {
        // Arrange
        const quotes: IQuote[] = [
            { } as IQuote,
            { } as IQuote,
        ];

        mongoFindOneSpy.mockResolvedValue(null); 
        mongoInsertManySpy.mockResolvedValueOnce({});

        // Act
        await mongoQuotesRepo.addQuotes(quotes);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledTimes(quotes.length);
        expect(mongoInsertManySpy).toHaveBeenCalledWith(
            quotes.map((quote) => ({
                ...quote,
                quoteId: expect.any(String),
            }))
        );
    });

    it('should throw UnableToAddManyQuotesError when encountering an error during insertion', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1
        ];

        const errorMessage = 'Insertion error';
        mongoFindOneSpy.mockResolvedValueOnce(null);
        mongoInsertManySpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.addQuotes(quotes)).rejects.toThrow(UnableToAddManyQuotesError);

        expect(mongoFindOneSpy).toHaveBeenCalledTimes(quotes.length);
        expect(mongoInsertManySpy).toHaveBeenCalledWith(quotes);
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

    it('should update an existing quote successfully', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        const existingQuote: IQuote = mockedQuote1;

        mongoUpdateOneSpy.mockResolvedValueOnce({});

        mongoQuotesRepo.getQuoteById = jest.fn().mockResolvedValueOnce(existingQuote);

        // Act
        await mongoQuotesRepo.updateQuote(quote);

        // Assert
        expect(mongoQuotesRepo.getQuoteById).toHaveBeenCalledWith(quote.quoteId);
        expect(mongoUpdateOneSpy).toHaveBeenCalledWith({ quoteId: quote.quoteId }, { $set: quote });
    });

    it('should throw QuoteNotFoundError when the quote does not exist', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        mongoQuotesRepo.getQuoteById = jest.fn().mockResolvedValueOnce(null);

        // Act
        await expect(mongoQuotesRepo.updateQuote(quote)).rejects.toThrow(QuoteNotFoundError);

        // Assert
        expect(mongoQuotesRepo.getQuoteById).toHaveBeenCalledWith(quote.quoteId);
        expect(mongoUpdateOneSpy).not.toHaveBeenCalled();
    });

    it('should throw UnableToUpdateQuoteError when encountering an error during update', async () => {
        // Arrange
        const quote: IQuote = mockedQuote1;

        const errorMessage = 'Update error';
        mongoUpdateOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        mongoQuotesRepo.getQuoteById = jest.fn().mockResolvedValueOnce(quote);

        // Act & Assert
        await expect(mongoQuotesRepo.updateQuote(quote)).rejects.toThrow(UnableToUpdateQuoteError);

        expect(mongoQuotesRepo.getQuoteById).toHaveBeenCalledWith(quote.quoteId);
        expect(mongoUpdateOneSpy).toHaveBeenCalledWith({ quoteId: quote.quoteId }, { $set: quote });
    });

    it('should perform bulk update operation for quotes', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1,
            mockedQuote2
        ];

        const bulkOps = quotes.map((quote) => ({
            updateOne: {
                filter: { quoteId: quote.quoteId },
                update: { $set: quote },
            },
        }));
        mongoBulkWriteSpy.mockResolvedValueOnce({});

        // Act
        await mongoQuotesRepo.updateQuotes(quotes);

        // Assert
        expect(mongoBulkWriteSpy).toHaveBeenCalledWith(bulkOps, { ordered: false });
    });

    it('should throw UnableToUpdateQuoteError when encountering an error during bulk update', async () => {
        // Arrange
        const quotes: IQuote[] = [
            mockedQuote1,
            mockedQuote2
        ];

        const errorMessage = 'Bulk update error';
        mongoBulkWriteSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.updateQuotes(quotes)).rejects.toThrow(UnableToUpdateQuoteError);
    });

    it('should remove an existing quote successfully', async () => {
        // Arrange
        const quoteId = '123';

        const deleteResult = {
            deletedCount: 1,
        };

        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);

        // Act
        await mongoQuotesRepo.removeQuote(quoteId);

        // Assert
        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ quoteId });
    });

    it('should throw QuoteNotFoundError when the quote does not exist', async () => {
        // Arrange
        const quoteId = '123';

        const deleteResult = {
            deletedCount: 0,
        };

        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);

        // Act & Assert
        await expect(mongoQuotesRepo.removeQuote(quoteId)).rejects.toThrow(QuoteNotFoundError);

        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ quoteId });
    });

    it('should throw UnableToDeleteQuoteError when encountering an error during deletion', async () => {
        // Arrange
        const quoteId = '123';

        const errorMessage = 'Deletion error';
        mongoDeleteOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.removeQuote(quoteId)).rejects.toThrow(UnableToDeleteQuoteError);

        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ quoteId });
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

    it('should return quotes when they exist', async () => {
        // Arrange
        const quote1 = mockedQuote1;

        const quote2 = mockedQuote2;

        const quotesData = [quote1, quote2];

        mongoToArraySpy.mockResolvedValueOnce(quotesData);

        // Act
        const quotes = await mongoQuotesRepo.getQuotes();

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledTimes(1);
        expect(quotes).toEqual(quotesData);
    });

    it('should throw UnableToGetQuotesError when encountering an error during retrieval', async () => {
        // Arrange
        const errorMessage = 'Retrieval error';

        mongoToArraySpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoQuotesRepo.getQuotes()).rejects.toThrow(UnableToGetQuotesError);

        expect(mongoFindSpy).toHaveBeenCalledTimes(1);
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