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

import {Collection, Db, Document, MongoClient, WithId} from "mongodb";
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
    BulkInsertMismatchBetweenRequestAndResponseLength,
    UnableToBulkInsertQuotesError,
    UnableToSearchQuotes,
    UnableToGetQuoteSearchKeywords
} from "../errors";
import { IQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { IQuote, QuotingSearchResults } from "@mojaloop/quoting-bc-public-types-lib";
import Redis from "ioredis";

const MAX_ENTRIES_PER_PAGE = 100;
const DB_NAME: string = "quoting";
const COLLECTION_NAME: string = "quotes";
const REDIS_KEY_PREFIX = "quoteById_";
const CACHE_TTL_SECS = 30;

export class MongoQuotesRepo implements IQuoteRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private _mongoClient: MongoClient;
    private _collection: Collection;
    private _redisClient: Redis;
    private readonly _redisTtlSecs: number;

    constructor(logger: ILogger, connectionString: string, redisHost: string, redisPort: number, redisCacheTtlSecs = CACHE_TTL_SECS) {
        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
        this._redisTtlSecs = redisCacheTtlSecs;

        this._redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
    }

    async init(): Promise<void> {
        this._logger.info("Initializing MongoQuotesRepo...");
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

        } catch (e: unknown) {
            this._logger.error(e, "Error initializing MongoQuotesRepo");
            throw new UnableToInitQuoteRegistryError("Error initializing MongoQuotesRepo");
        }

        try{
            await this._redisClient.connect();
            this._logger.debug("Connected to Redis successfully");
        }catch(error: unknown){
            this._logger.error(`Unable to connect to redis cache: ${(error as Error).message}`);
            throw error;
        }

        this._logger.info("MongoQuotesRepo initialized");
    }

    private _getKeyWithPrefix (key: string): string {
        return REDIS_KEY_PREFIX + key;
    }

    private async _getFromCache(id:string):Promise<IQuote | null>{
        const itemStr = await this._redisClient.get(this._getKeyWithPrefix(id));
        if(!itemStr) return null;

        try{
            const item = JSON.parse(itemStr);
            return item;
        }catch (e) {
            this._logger.error(e);
            return null;
        }
    }

    private async _setToCache(quote:IQuote):Promise<void>{
        const key = this._getKeyWithPrefix(quote.quoteId);
        await this._redisClient.setex(key, this._redisTtlSecs, JSON.stringify(quote));
    }

    private async _setToCacheMultiple(quotes:IQuote[]):Promise<void>{
        const redisCmds = quotes.map(quote => {
            return [
                "set",
                this._getKeyWithPrefix(quote.quoteId),
                JSON.stringify(quote),
                this._redisTtlSecs
            ];
        });

        await this._redisClient.multi(redisCmds).exec();
    }

    async destroy(): Promise<void> {
        try {
            await this._mongoClient.close();
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

    async getQuoteById(quoteId: string): Promise<IQuote | null> {
        const found = await this._getFromCache(quoteId);
        if(found) return found;

        const quoteDoc = await this._collection.findOne({ quoteId: quoteId }).catch((e: unknown) => {
            this._logger.error(`Unable to get quote by id: ${(e as Error).message}`);
            throw new UnableToGetQuoteError("Unable to get quote by id");
        });

        if (!quoteDoc) {
            return null;
        }

        const quote = this._mapToQuote(quoteDoc);
        await this._setToCache(quote);
        return quote;
    }

    async getQuotesByBulkQuoteId(
        bulkQuoteId: string
    ): Promise<IQuote[]> {
        const quotes = await this._collection
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
            mappedQuotes.push(this._mapToQuote(quote));
        }

        return mappedQuotes;
    }


    async storeQuotes(quotes: IQuote[]): Promise<void> {
        // do this in parallel because they are separate storage mechanisms
        await Promise.all([
            this._storeMultipleInMongo(quotes), this._setToCacheMultiple(quotes)
        ]);
	}

    private async _storeMultipleInMongo(quotes: IQuote[]): Promise<void> {
        const operations = quotes.map(value => {
            return {
                replaceOne: {
                    filter: {quoteId: value.quoteId},
                    replacement: value,
                    upsert: true
                }
            };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let updateResult: any;
        try {
            updateResult = await this._collection.bulkWrite(operations);

            if ((updateResult.upsertedCount + updateResult.modifiedCount) !== quotes.length) {
                this._logger.error("Could not storeQuotes - mismatch between requests length and MongoDb response length");
                throw new BulkInsertMismatchBetweenRequestAndResponseLength(
                    "Could not storeQuotes - mismatch between requests length and MongoDb response length"
                );
            }
        } catch (e: unknown) {
            this._logger.error(
                `Unable to bulk insert quotes: ${(e as Error).message}`
            );
            throw new UnableToBulkInsertQuotesError(
                "Unable to bulk insert quotes"
            );
        }
    }

    private _mapToQuote(quote: WithId<Document>): IQuote {
        const quoteMapped: IQuote = {
            createdAt: quote.createdAt ?? null,
			updatedAt: quote.updatedAt ?? null,
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
            status: quote.status ?? null,
            totalTransferAmount: quote.totalTransferAmount ?? null,
            destinationFspId: quote.destinationFspId ?? null,
            payeeFspCommission: quote.payeeFspCommission ?? null,
            payeeFspFee: quote.payeeFspFee ?? null,
            payeeReceiveAmount: quote.payeeReceiveAmount ?? null,
            requesterFspId: quote.requesterFspId ?? null,
            errorInformation: quote.errorInformation ?? null,
            transferAmount: quote.transferAmount ?? null,
            // Protocol Specific
            inboundProtocolType: quote.inboundProtocolType ?? null,
            inboundProtocolOpaqueState: quote.inboundProtocolOpaqueState ?? null,
        };
        return quoteMapped;
    }

	async searchQuotes(
        amountType: string | null,
        transactionType: string | null,
        quoteId: string | null,
        transactionId: string | null,
        bulkQuoteId: string | null,
        payerId: string | null,
        payeeId: string | null,
        status: string | null,
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
        if (bulkQuoteId) {
            filter.$and.push({ bulkQuoteId: { $regex: bulkQuoteId, $options: "i" } });
        }
        if (payerId) {
            filter.$and.push({ "payer.partyIdInfo.fspId": payerId });
        }
        if (payeeId) {
            filter.$and.push({ "payee.partyIdInfo.fspId": payeeId });
        }
        if (status) {
            filter.$and.push({ status: status });
        }

        if(filter.$and.length === 0) {
            filter = {};
        }

        try {
            const skip = Math.floor(pageIndex * pageSize);
			const result = await this._collection.find(
				filter,
				{
					sort:["updatedAt", "desc"],
                    projection: {_id: 0},
					skip: skip,
                    limit: pageSize
				}
			).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get quotes: ${(e as Error).message}`);
                throw new UnableToGetQuotesError("Unable to get quotes");
			});

            const countResult = await this._collection.countDocuments(filter).catch(reason => {
                this._logger.error("Unable to get quotes count");
            }) || result.length;

            searchResults.items = result.map(this._mapToQuote);

            searchResults.totalPages = Math.ceil(countResult / pageSize);
            searchResults.pageSize = Math.max(pageSize, result.length);

        } catch (err) {
            this._logger.error(err);
            throw new UnableToSearchQuotes("Unable to return quotes search");
        }

        return Promise.resolve(searchResults);
    }

	async getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>{
        const retObj:{fieldName:string, distinctTerms:string[]}[] = [];

        try {
            const result = this._collection
                .aggregate([
					{$group: { "_id": { amountType: "$amountType", transactionType: "$transactionType", status: "$status" } } }
				]);

			const amountType:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "amountType",
				distinctTerms: []
			};

			const transactionType:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "transactionType",
				distinctTerms: []
			};

            const status: {fieldName:string, distinctTerms:string[]} = {
				fieldName: "status",
				distinctTerms: []
			};

			for await (const term of result) {
				if(term._id.amountType && !amountType.distinctTerms.includes(term._id.amountType)) {
					amountType.distinctTerms.push(term._id.amountType);
				}
				
				if(term._id.transactionType?.scenario && !transactionType.distinctTerms.includes(term._id.transactionType.scenario)) {
					transactionType.distinctTerms.push(term._id.transactionType.scenario);
				}

                if (term._id.status && !status.distinctTerms.includes(term._id.status)) {
                    status.distinctTerms.push(term._id.status);
                }
			}

            retObj.push(amountType);
            retObj.push(transactionType);
            retObj.push(status);

        } catch (err) {
            this._logger.error(err);
            throw new UnableToGetQuoteSearchKeywords("Unable to get search quote keywords");
        }

        return Promise.resolve(retObj);
    }


/*
    async updateQuote(quote: IQuote): Promise<void> {
        const existingQuote = await this.getQuoteById(quote.quoteId);

        if (!existingQuote || !existingQuote.quoteId) {
            throw new QuoteNotFoundError("Quote not found");
        }

        await this._collection
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
        await this._collection.bulkWrite(bulkOps, { ordered: false, }).catch((e: unknown) => {
            this._logger.error(
                `Unable to update many quotes: ${(e as Error).message}`
            );
            throw new UnableToUpdateQuoteError("Unable to update many quotes");
        });
    }

    async removeQuote(quoteId: string): Promise<void> {
        const deleteResult = await this._collection
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

    async addQuote(quote: IQuote): Promise<string> {
        const quoteToAdd = { ...quote };
        if (quoteToAdd.quoteId) {
            await this.checkIfQuoteExists(quote);
        }

        await this._collection.insertOne(quoteToAdd).catch((e: unknown) => {
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

        await this._collection.insertMany(quotesToAdd).catch((e: unknown) => {
            this._logger.error(
                `Unable to insert many quotes: ${(e as Error).message}`
            );
            throw new UnableToAddManyQuotesError(
                "Unable to insert many quotes"
            );
        });
    }


    async getQuotes(): Promise<IQuote[]> {
        const quotes = await this._collection
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

    private async checkIfQuoteExists(quote: IQuote) {
        const quoteAlreadyPresent: WithId<Document> | null = await this._collection
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
*/

}
