/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>./*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";

import { MongoClient } from "mongodb";
import { MongoBulkQuotesRepo } from "../../../src/quotes/mongo_bulk_quotes_repo";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { BulkQuoteAlreadyExistsError, BulkQuoteNotFoundError, UnableToAddBulkQuoteError, UnableToCloseDatabaseConnectionError, UnableToDeleteBulkQuoteError, UnableToGetBulkQuoteError, UnableToInitBulkQuoteRegistryError, UnableToUpdateBulkQuoteError } from "../../../src/errors";
import { IBulkQuote } from "@mojaloop/quoting-bc-public-types-lib";
import { mockedBulkQuote1, mockedBulkQuote2 } from "@mojaloop/quoting-bc-shared-mocks-lib";


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
const dbName = "bulk_quotes";

describe("Implementations - Mongo Bulk Quotes Repo Unit Tests", () => {
    let mongoBulkQuotesRepo: MongoBulkQuotesRepo;

    beforeEach(async () => {
        jest.clearAllMocks();

        mongoToArrayListCollectionsSpy.mockResolvedValue([
            { name: dbName },
        ]);

        mongoBulkQuotesRepo = new MongoBulkQuotesRepo(logger, connectionString);

        await mongoBulkQuotesRepo.init();

    });

    it('should initialize the MongoDB connection and quotes collection', async () => {
        // Arrange
        await mongoBulkQuotesRepo.init();

        // Act & Assert
        expect(MongoClient).toHaveBeenCalledWith(connectionString);
        expect(mongoCollectionSpy).toHaveBeenCalledWith('bulk_quotes');
    });

    it('should throw an error if unable to connect to the database', async () => {
        // Arrange
        mongoConnectSpy.mockImplementationOnce(() => { throw new Error(); })

        // Act & Assert
        await expect(mongoBulkQuotesRepo.init()).rejects.toThrow(UnableToInitBulkQuoteRegistryError);
    });

    it('should close the database connection', async () => {
        // Act
        await mongoBulkQuotesRepo.destroy();

        // Assert
        expect(mongoCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw UnableToCloseDatabaseConnectionError when encountering an error during closing', async () => {
        // Arrange
        const errorMessage = 'Closing error';

        mongoCloseSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoBulkQuotesRepo.destroy()).rejects.toThrow(UnableToCloseDatabaseConnectionError);
    });

    it('should return the bulk quote when it exists', async () => {
        // Arrange
        const bulkQuoteId = '123';
        const bulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(bulkQuote);

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(result).toEqual(bulkQuote);
    });

    it('should return null when the bulk quote does not exist', async () => {
        // Arrange
        const bulkQuoteId = '123';

        mongoFindOneSpy.mockResolvedValueOnce(null);

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuoteById(bulkQuoteId);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(result).toBeNull();
    });

    it('should throw UnableToGetBulkQuoteError when encountering an error during retrieval', async () => {
        // Arrange
        const bulkQuoteId = '123';
        const errorMessage = 'Retrieval error';

        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act
        await expect(mongoBulkQuotesRepo.getBulkQuoteById(bulkQuoteId)).rejects.toThrow(UnableToGetBulkQuoteError);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
    });

    it('should return bulk quotes when they exist', async () => {
        // Arrange
        const bulkQuotes: IBulkQuote[] = [
            mockedBulkQuote1,
            mockedBulkQuote2
        ];

        mongoToArraySpy.mockResolvedValueOnce(bulkQuotes);

        // Act
        const result = await mongoBulkQuotesRepo.getBulkQuotes();

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledWith({});
        expect(mongoToArraySpy).toHaveBeenCalledTimes(1);
        expect(result).toEqual(bulkQuotes);
    });

    it('should throw UnableToGetBulkQuoteError when encountering an error during retrieval', async () => {
        // Arrange
        const errorMessage = 'Retrieval error';

        mongoToArraySpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act
        await expect(mongoBulkQuotesRepo.getBulkQuotes()).rejects.toThrow(UnableToGetBulkQuoteError);

        // Assert
        expect(mongoFindSpy).toHaveBeenCalledWith({});
        expect(mongoToArraySpy).toHaveBeenCalledTimes(1);
    });

    it('should add a bulk quote and return its ID', async () => {
        // Arrange
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(null); // Simulate bulk quote not existing
        mongoInsertOneSpy.mockResolvedValueOnce({ insertedId: bulkQuote.bulkQuoteId });

        // Act
        const result = await mongoBulkQuotesRepo.addBulkQuote(bulkQuote);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId: bulkQuote.bulkQuoteId });
        expect(mongoInsertOneSpy).toHaveBeenCalledWith(bulkQuote);
        expect(result).toEqual(bulkQuote.bulkQuoteId);
    });

    it('should throw BulkQuoteAlreadyExistsError when the bulk quote already exists', async () => {
        // Arrange
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce({ bulkQuoteId: bulkQuote.bulkQuoteId });

        // Act & Assert
        await expect(mongoBulkQuotesRepo.addBulkQuote(bulkQuote)).rejects.toThrow(BulkQuoteAlreadyExistsError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId: bulkQuote.bulkQuoteId });
        expect(mongoInsertOneSpy).not.toHaveBeenCalled();
    });

    it('should throw UnableToAddBulkQuoteError when encountering an error during insertion', async () => {
        // Arrange
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        const errorMessage = 'Insertion error';
        mongoFindOneSpy.mockResolvedValueOnce(null); // Simulate bulk quote not existing
        mongoInsertOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoBulkQuotesRepo.addBulkQuote(bulkQuote)).rejects.toThrow(UnableToAddBulkQuoteError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId: bulkQuote.bulkQuoteId });
        expect(mongoInsertOneSpy).toHaveBeenCalledWith(bulkQuote);
    });

    it('should update an existing bulk quote', async () => {
        // Arrange
        const bulkQuoteId = '1';
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        const existingBulkQuote: IBulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(existingBulkQuote);
        mongoUpdateOneSpy.mockResolvedValueOnce({});

        // Act
        await mongoBulkQuotesRepo.updateBulkQuote(bulkQuote);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(mongoUpdateOneSpy).toHaveBeenCalledWith(
            { bulkQuoteId },
            { $set: bulkQuote }
        );
    });

    it('should throw BulkQuoteNotFoundError when the bulk quote does not exist', async () => {
        // Arrange
        const bulkQuoteId = '1';
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(null);

        // Act & Assert
        await expect(mongoBulkQuotesRepo.updateBulkQuote(bulkQuote)).rejects.toThrow(BulkQuoteNotFoundError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(mongoUpdateOneSpy).not.toHaveBeenCalled();
    });

    it('should throw UnableToUpdateBulkQuoteError when encountering an error during update', async () => {
        // Arrange
        const bulkQuoteId = '1';
        const bulkQuote: IBulkQuote = mockedBulkQuote1;

        const errorMessage = 'Update error';
        const existingBulkQuote: IBulkQuote = mockedBulkQuote1;

        mongoFindOneSpy.mockResolvedValueOnce(existingBulkQuote);
        mongoUpdateOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoBulkQuotesRepo.updateBulkQuote(bulkQuote)).rejects.toThrow(UnableToUpdateBulkQuoteError);

        expect(mongoFindOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
        expect(mongoUpdateOneSpy).toHaveBeenCalledWith(
            { bulkQuoteId },
            { $set: bulkQuote }
        );
    });

    it('should remove a bulk quote', async () => {
        // Arrange
        const bulkQuoteId = '1';

        const deleteResult = { deletedCount: 1 };
        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);

        // Act
        await mongoBulkQuotesRepo.removeBulkQuote(bulkQuoteId);

        // Assert
        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
    });

    it('should throw BulkQuoteNotFoundError when the bulk quote does not exist', async () => {
        // Arrange
        const bulkQuoteId = '1';

        const deleteResult = { deletedCount: 0 };
        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);

        // Act & Assert
        await expect(mongoBulkQuotesRepo.removeBulkQuote(bulkQuoteId)).rejects.toThrow(BulkQuoteNotFoundError);

        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
    });

    it('should throw UnableToDeleteBulkQuoteError when encountering an error during deletion', async () => {
        // Arrange
        const bulkQuoteId = '1';
        const errorMessage = 'Deletion error';

        mongoDeleteOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoBulkQuotesRepo.removeBulkQuote(bulkQuoteId)).rejects.toThrow(UnableToDeleteBulkQuoteError);

        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ bulkQuoteId });
    });
});
