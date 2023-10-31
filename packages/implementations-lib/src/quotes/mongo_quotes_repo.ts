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
    QuoteAlreadyExistsError,
    UnableToCloseDatabaseConnectionError,
    UnableToDeleteQuoteError,
    UnableToGetQuoteError,
    UnableToInitQuoteRegistryError,
    UnableToAddQuoteError,
    UnableToUpdateQuoteError,
    UnableToAddManyQuotesError,
    UnableToGetQuotesError,
    QuoteNotFoundError,
} from "../errors";
import {
    IQuoteRepo,
    IQuote,
    QuotingSearchResults
} from "@mojaloop/quoting-bc-domain-lib";
import { randomUUID } from "crypto";

const MAX_ENTRIES_PER_PAGE = 100;

export class MongoQuotesRepo implements IQuoteRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private readonly _dbName;
    private readonly _collectionName = "quotes";
    private mongoClient: MongoClient;
    private quotes: Collection;

    constructor(logger: ILogger, connectionString: string, dbName: string) {
        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
        this._dbName = dbName;
    }

    async init(): Promise<void> {
        try {
            this.mongoClient = new MongoClient(this._connectionString);
            this.mongoClient.connect();
            this.quotes = this.mongoClient
                .db(this._dbName)
                .collection(this._collectionName);
        } catch (e: unknown) {
            this._logger.error(
                `Unable to connect to the database: ${(e as Error).message}`
            );
            throw new UnableToInitQuoteRegistryError(
                "Unable to connect to quote DB"
            );
        }
    }

    async destroy(): Promise<void> {
        try {
            await this.mongoClient.close();
        } catch (e: unknown) {
            this._logger.error(
                `Unable to close the database connection: ${(e as Error).message
                }`
            );
            throw new UnableToCloseDatabaseConnectionError(
                "Unable to close quote DB connection"
            );
        }
    }

    async addQuote(quote: IQuote): Promise<string> {
        const quoteToAdd = { ...quote };
        if (quoteToAdd.quoteId) {
            await this.checkIfQuoteExists(quote).catch((e: unknown) => {
                this._logger.error(
                    `Duplicate Quote: ${(e as Error).message}`
                );
            });
        }

        await this.quotes.insertOne(quoteToAdd).catch((e: unknown) => {
            this._logger.error(
                `Unable to insert quote: ${(e as Error).message}`
            );
            throw new UnableToAddQuoteError("Unable to insert quote");
        });

        return quoteToAdd.quoteId;
    }

    async addQuotes(quotes: IQuote[]): Promise<void> {
        const quotesToAdd = quotes.map((quote) => {
            return { ...quote, quoteId: quote.quoteId || randomUUID() };
        });

        // Check if any of the quotes already exists
        for await (const quote of quotesToAdd) {
            await this.checkIfQuoteExists(quote);
        }

        await this.quotes.insertMany(quotesToAdd).catch((e: unknown) => {
            this._logger.error(
                `Unable to insert many quotes: ${(e as Error).message}`
            );
            throw new UnableToAddManyQuotesError(
                "Unable to insert many quotes"
            );
        });
    }

    async updateQuote(quote: IQuote): Promise<void> {
        const existingQuote = await this.getQuoteById(quote.quoteId);

        if (!existingQuote || !existingQuote.quoteId) {
            throw new QuoteNotFoundError("Quote not found");
        }

        await this.quotes
            .updateOne({ quoteId: quote.quoteId }, { $set: quote })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to insert quote: ${(e as Error).message}`
                );
                throw new UnableToUpdateQuoteError("Unable to update quote");
            });
    }

    async updateQuotes(quotes: IQuote[]): Promise<void> {
        const bulkOps = quotes.map((quote) => ({
            updateOne: {
                filter: { quoteId: quote.quoteId },
                update: { $set: quote },
            },
        }));

        // Perform the bulk update operation
        await this.quotes.bulkWrite(bulkOps, { ordered: false, }).catch((e: unknown) => {
            this._logger.error(
                `Unable to update many quotes: ${(e as Error).message}`
            );
            throw new UnableToUpdateQuoteError("Unable to update many quotes");
        });
    }

    async removeQuote(quoteId: string): Promise<void> {
        const deleteResult = await this.quotes
            .deleteOne({ quoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to delete quote: ${(e as Error).message}`
                );
                throw new UnableToDeleteQuoteError("Unable to delete quote");
            });

        if (deleteResult.deletedCount == 1) {
            return;
        } else {
            throw new QuoteNotFoundError("Quote not found");
        }
    }

    async getQuoteById(quoteId: string): Promise<IQuote | null> {
        const quote = await this.quotes
            .findOne({ quoteId: quoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get quote by id: ${(e as Error).message}`
                );
                throw new UnableToGetQuoteError("Unable to get quote by id");
            });

        if (!quote) {
            return null;
        }
        return this.mapToQuote(quote);
    }

    async getQuotes(): Promise<IQuote[]> {
        const quotes = await this.quotes
            .find()
            .toArray()
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get quotes: ${(e as Error).message}`
                );
                throw new UnableToGetQuotesError("Unable to get quotes");
            });

        const mappedQuotes = [];

        for (const quote of quotes) {
            mappedQuotes.push(this.mapToQuote(quote));
        }

        return mappedQuotes;
    }

    async getQuotesByBulkQuoteId(
        bulkQuoteId: string
    ): Promise<IQuote[]> {
        const quotes = await this.quotes
            .find({
                bulkQuoteId: bulkQuoteId,
            })
            .toArray()
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get quotes by bulk quote id: ${(e as Error).message
                    }`
                );
                throw new UnableToGetQuotesError("Unable to get quotes");
            });

        const mappedQuotes = [];

        for (const quote of quotes) {
            mappedQuotes.push(this.mapToQuote(quote));
        }

        return mappedQuotes;
    }

    private async checkIfQuoteExists(quote: IQuote) {
        const quoteAlreadyPresent: WithId<Document> | null = await this.quotes
            .findOne({
                quoteId: quote.quoteId,
            })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to add quote: ${(e as Error).message}`
                );
                throw new UnableToGetQuoteError("Unable to add quote");
            });

        if (quoteAlreadyPresent) {
            throw new QuoteAlreadyExistsError("Quote already exists");
        }
    }

    private mapToQuote(quote: WithId<Document>): IQuote {
        const quoteMapped: IQuote = {
            quoteId: quote.quoteId ?? null,
            bulkQuoteId: quote.bulkQuoteId ?? null,
            transactionId: quote.transactionId ?? null,
            payee: quote.payee ?? null,
            payer: quote.payer ?? null,
            amountType: quote.amountType ?? null,
            amount: quote.amount ?? null,
            transactionType: quote.transactionType ?? null,
            feesPayer: quote.feesPayer ?? null,
            transactionRequestId: quote.transactionRequestId ?? null,
            geoCode: quote.geoCode ?? null,
            note: quote.note ?? null,
            expiration: quote.expiration ?? null,
            extensionList: quote.extensionList ?? null,
            status: quote.status ?? null,
            totalTransferAmount: quote.totalTransferAmount ?? null,
            ilpPacket: quote.ilpPacket ?? null,
            condition: quote.condition ?? null,
            destinationFspId: quote.destinationFspId ?? null,
            payeeFspCommission: quote.payeeFspCommission ?? null,
            payeeFspFee: quote.payeeFspFee ?? null,
            payeeReceiveAmount: quote.payeeReceiveAmount ?? null,
            requesterFspId: quote.requesterFspId ?? null,
            errorInformation: quote.errorInformation ?? null,
            transferAmount: quote.transferAmount ?? null,
        };
        return quoteMapped;
    }

    
	async searchQuotes(
        amountType:string|null,
        transactionType:string|null,
        quoteId:string|null,
        transactionId:string|null,
        bulkQuoteId:string|null,
        pageIndex = 0,
        pageSize: number = MAX_ENTRIES_PER_PAGE
    ): Promise<any> {
        // make sure we don't go over or below the limits
        pageSize = Math.min(pageSize, MAX_ENTRIES_PER_PAGE);
        pageIndex = Math.max(pageIndex, 0);

        const searchResults: QuotingSearchResults = {
            pageSize: pageSize,
            pageIndex: pageIndex,
            totalPages: 0,
            items: []
        };

        let filter: any = { $and: [] }; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (quoteId) {
            filter.$and.push({ quoteId: { $regex: quoteId, $options: "i" } });
        }
        if (transactionId) {
            filter.$and.push({ transactionId: { $regex: transactionId, $options: "i" } });
        }
        if (amountType) {
            filter.$and.push({ amountType });
        }
        if (transactionType) {
            filter.$and.push({ "transactionType.scenario": transactionType });
        }    
        if(bulkQuoteId){
            filter.$and.push({ bulkQuoteId: { $regex: bulkQuoteId, $options: "i" } });
        }
        if(filter.$and.length === 0) {
            filter = {};
        }

        try {
            const skip = Math.floor(pageIndex * pageSize);
			const result = await this.quotes.find(
				filter,
				{
					sort:["updatedAt", "desc"], 
					skip: skip,
                    limit: 20
				}
			).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get quotes: ${(e as Error).message}`);
                throw new UnableToGetQuotesError("Unable to get quotes");
			});

			searchResults.items = result as unknown as IQuote[];

			const totalEntries = await this.quotes.find(
				filter
            ).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get quotes page size: ${(e as Error).message}`);
                throw new UnableToGetQuotesError("Unable to get quotes page size");
			});

			searchResults.totalPages = Math.ceil(totalEntries.length / pageSize);
			searchResults.pageSize = Math.max(pageSize, result.length);
            
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(searchResults);
    }

	async getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>{
        const retObj:{fieldName:string, distinctTerms:string[]}[] = [];

        try {
            const result = this.quotes
                .aggregate([
					{$group: { "_id": { amountType: "$amountType", transactionType: "$transactionType" } } }
				]);

			const amountType:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "amountType",
				distinctTerms: []
			};

			const transactionType:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "transactionType",
				distinctTerms: []
			};

			for await (const term of result) {

				if(!amountType.distinctTerms.includes(term._id.amountType)) {
					amountType.distinctTerms.push(term._id.amountType);
				}
				retObj.push(amountType);

				if(!transactionType.distinctTerms.includes(term._id.transactionType.scenario)) {
					transactionType.distinctTerms.push(term._id.transactionType.scenario);
				}
				retObj.push(transactionType);
			}
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(retObj);
    }
}
