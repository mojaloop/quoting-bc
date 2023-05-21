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

import { Collection, Document, MongoClient, WithId } from "mongodb";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import {
    BulkQuoteAlreadyExistsError,
    UnableToCloseDatabaseConnectionError,
    UnableToInitBulkQuoteRegistryError,
    UnableToGetBulkQuoteError,
    UnableToAddBulkQuoteError,
    UnableToUpdateBulkQuoteError,
    UnableToDeleteBulkQuoteError,
    BulkQuoteNotFoundError,
} from "../errors";
import { IBulkQuoteRepo, IBulkQuote } from "@mojaloop/quoting-bc-domain-lib";

export class MongoBulkQuotesRepo implements IBulkQuoteRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private readonly _dbName;
    private readonly _collectionName = "bulk_quotes";
    private mongoClient: MongoClient;
    private bulkQuotes: Collection;

    constructor(logger: ILogger, connectionString: string, dbName: string) {
        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
        this._dbName = dbName;
    }

    async init(): Promise<void> {
        try {
            this.mongoClient = new MongoClient(this._connectionString);
            this.mongoClient.connect();
            this.bulkQuotes = this.mongoClient
                .db(this._dbName)
                .collection(this._collectionName);
        } catch (e: unknown) {
            this._logger.error(
                `Unable to connect to the database: ${(e as Error).message}`
            );
            throw new UnableToInitBulkQuoteRegistryError(
                "Unable to connect to the database"
            );
        }
    }

    async destroy(): Promise<void> {
        try {
            await this.mongoClient.close();
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
        const bulkQuote = await this.bulkQuotes
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
        const bulkQuotes = await this.bulkQuotes
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

        await this.bulkQuotes.insertOne(bulkQuoteToAdd).catch((e: unknown) => {
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

        await this.bulkQuotes
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
        const deleteResult = await this.bulkQuotes
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
            await this.bulkQuotes
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
            bulkQuoteId: bulkQuote.bulkQuoteId ?? null,
            payer: bulkQuote.payer ?? null,
            geoCode: bulkQuote.geoCode ?? null,
            expiration: bulkQuote.expiration ?? null,
            extensionList: bulkQuote.extensionList ?? null,
            individualQuotes: bulkQuote.individualQuotes ?? [],
            quotesNotProcessedIds: bulkQuote.quotesNotProcessedIds ?? [],
            status: bulkQuote.status ?? null,
        };
        return quoteMapped;
    }
}
