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
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import {Collection, Db, Document, MongoClient, WithId} from "mongodb";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import {
    BulkQuoteAlreadyExistsError,
    UnableToCloseDatabaseConnectionError,
    UnableToInitBulkQuoteRegistryError,
    UnableToGetBulkQuoteError,
    UnableToAddBulkQuoteError,
    UnableToUpdateBulkQuoteError,
    UnableToDeleteBulkQuoteError,
    BulkQuoteNotFoundError, UnableToInitQuoteRegistryError,
} from "../errors";
import { IBulkQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { IBulkQuote } from "@mojaloop/quoting-bc-public-types-lib";

const DB_NAME: string = "quoting";
const COLLECTION_NAME: string = "bulk_quotes";

export class MongoBulkQuotesRepo implements IBulkQuoteRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private _mongoClient: MongoClient;
    private _collection: Collection;

    constructor(logger: ILogger, connectionString: string) {
        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
    }

    async init(): Promise<void> {
        this._logger.info("Initializing MongoBulkQuotesRepo...");
        try {
            this._mongoClient = new MongoClient(this._connectionString);
            await this._mongoClient.connect();

            const db: Db = this._mongoClient.db(DB_NAME);

            // Check if the collection already exists.
            const collections: any[] = await db.listCollections().toArray();
            const collectionExists: boolean = collections.some((collection) => {
                return collection.name === COLLECTION_NAME;
            });

            // collection() creates the collection if it doesn't already exist, however, it doesn't allow for a schema
            // to be passed as an argument.
            if (collectionExists) {
                this._collection = db.collection(COLLECTION_NAME);
            }else{
                this._collection = await db.createCollection(COLLECTION_NAME );
                await this._collection.createIndex({"quoteId": 1}, {unique: true});
            }
            this._logger.info("MongoBulkQuotesRepo initialized");
        } catch (e: unknown) {
            this._logger.error(e, "Error initializing MongoBulkQuotesRepo");
            throw new UnableToInitBulkQuoteRegistryError( "Error initializing MongoBulkQuotesRepo");
        }
    }

    async destroy(): Promise<void> {
        try {
            await this._mongoClient.close();
        } catch (e: unknown) {
            this._logger.error(
                `Unable to close the database connection: ${
                    (e as Error).message
                }`
            );
            throw new UnableToCloseDatabaseConnectionError(
                "Unable to close the database connection"
            );
        }
    }

    async getBulkQuoteById(bulkQuoteId: string): Promise<IBulkQuote | null> {
        const bulkQuote = await this._collection
            .findOne({ bulkQuoteId: bulkQuoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get bulkQuote by id: ${(e as Error).message}`
                );
                throw new UnableToGetBulkQuoteError(
                    "Unable to get bulkQuote by id"
                );
            });
        if (!bulkQuote) {
            return null;
        }
        return this.mapToBulkQuote(bulkQuote);
    }

    async getBulkQuotes(): Promise<IBulkQuote[]> {
        const bulkQuotes = await this._collection
            .find({})
            .toArray()
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get bulkQuotes: ${(e as Error).message}`
                );
                throw new UnableToGetBulkQuoteError("Unable to get bulkQuotes");
            });

        const mappedBulkQuotes: IBulkQuote[] = [];
        for (const bulkQuote of bulkQuotes) {
            mappedBulkQuotes.push(this.mapToBulkQuote(bulkQuote));
        }

        return mappedBulkQuotes;
    }

    async addBulkQuote(bulkQuote: IBulkQuote): Promise<string> {
        const bulkQuoteToAdd = { ...bulkQuote };

        if (bulkQuoteToAdd.bulkQuoteId) {
            await this.checkIfBulkQuoteExists(bulkQuoteToAdd);
        }

        await this._collection.insertOne(bulkQuoteToAdd).catch((e: unknown) => {
            this._logger.error(
                `Unable to insert bulkQuote: ${(e as Error).message}`
            );
            throw new UnableToAddBulkQuoteError("Unable to add bulkQuote");
        });

        return bulkQuoteToAdd.bulkQuoteId;
    }

    async updateBulkQuote(bulkQuote: IBulkQuote): Promise<void> {
        const existingBulkQuote = await this.getBulkQuoteById(
            bulkQuote.bulkQuoteId
        );

        if (!existingBulkQuote || !existingBulkQuote.bulkQuoteId) {
            throw new BulkQuoteNotFoundError(
                "Unable to find bulkQuote to update"
            );
        }

        const updatedQuote: IBulkQuote = { ...existingBulkQuote, ...bulkQuote };
        updatedQuote.bulkQuoteId = existingBulkQuote.bulkQuoteId;

        await this._collection
            .updateOne(
                { bulkQuoteId: bulkQuote.bulkQuoteId },
                { $set: updatedQuote }
            )
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to insert bulkQuote: ${(e as Error).message}`
                );
                throw new UnableToUpdateBulkQuoteError(
                    "Unable to update bulkQuote"
                );
            });
    }

    async removeBulkQuote(bulkQuoteId: string): Promise<void> {
        const deleteResult = await this._collection
            .deleteOne({ bulkQuoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to delete bulkQuote: ${(e as Error).message}`
                );
                throw new UnableToDeleteBulkQuoteError(
                    "Unable to delete bulkQuote"
                );
            });
        if (deleteResult.deletedCount == 1) {
            return;
        } else {
            throw new BulkQuoteNotFoundError(
                "Unable to find bulkQuote to delete"
            );
        }
    }

    private async checkIfBulkQuoteExists(bulkQuote: IBulkQuote) {
        const quoteAlreadyPresent: WithId<Document> | null =
            await this._collection
                .findOne({
                    bulkQuoteId: bulkQuote.bulkQuoteId,
                })
                .catch((e: unknown) => {
                    this._logger.error(
                        `Unable to add bulk bulkQuote: ${(e as Error).message}`
                    );
                    throw new UnableToGetBulkQuoteError(
                        "Unable to get bulkQuote"
                    );
                });

        if (quoteAlreadyPresent) {
            throw new BulkQuoteAlreadyExistsError("BulkQuote already exists");
        }
    }

    private mapToBulkQuote(bulkQuote: WithId<Document>): IBulkQuote {
        const quoteMapped: IBulkQuote = {
            createdAt: bulkQuote.createdAt ?? null,
			updatedAt: bulkQuote.updatedAt ?? null,
            bulkQuoteId: bulkQuote.bulkQuoteId ?? null,
            payer: bulkQuote.payer ?? null,
            geoCode: bulkQuote.geoCode ?? null,
            expiration: bulkQuote.expiration ?? null,
            individualQuotes: bulkQuote.individualQuotes ?? [],
            quotesNotProcessedIds: bulkQuote.quotesNotProcessedIds ?? [],
            status: bulkQuote.status ?? null,
            extensions: bulkQuote.extensions ?? null,
            // Protocol Specific
            inboundProtocolType: bulkQuote.inboundProtocolType ?? null,
            inboundProtocolOpaqueState: bulkQuote.inboundProtocolOpaqueState ?? null,
        };
        return quoteMapped;
    }
}
