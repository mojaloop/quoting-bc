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

 import {
	Collection,
	Document,
	MongoClient,
	WithId
} from 'mongodb';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { QuoteAlreadyExistsError, UnableToCloseDatabaseConnectionError, UnableToDeleteQuoteError, UnableToGetQuoteError, UnableToInitQuoteRegistryError, UnableToAddQuoteError, NoSuchQuoteError, UnableToUpdateQuoteError } from '../errors';
import { IQuoteRegistry, NonExistingQuoteError, QuoteRegistry } from "@mojaloop/quoting-bc-domain";
import { randomUUID } from 'crypto';

export class MongoQuoteRegistryRepo implements IQuoteRegistry {
	private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName;
	private readonly _collectionName = "quotes";
	private mongoClient: MongoClient;
	private quotes: Collection;

	constructor(
		logger: ILogger,
        connectionString: string,
		dbName: string
	) {
		this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
		this._dbName = dbName;
	}

	async init(): Promise<void> {
		try {
			this.mongoClient = new MongoClient(this._connectionString);
			this.mongoClient.connect();
			this.quotes = this.mongoClient.db(this._dbName).collection(this._collectionName);
		} catch (e: any) {
			this._logger.error(`Unable to connect to the database: ${e.message}`);
			throw new UnableToInitQuoteRegistryError();
		}
	}

	async destroy(): Promise<void> {
		try{
			await this.mongoClient.close();
		}
		catch(e: any){
			this._logger.error(`Unable to close the database connection: ${e.message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}
	}

	async addQuote(quote: QuoteRegistry): Promise<string> {
		if(quote.quoteId){
			await this.checkIfQuoteExists(quote);
		}

		try {
			quote.quoteId = quote.quoteId || randomUUID();
			await this.quotes.insertOne(quote);
			return quote.quoteId;
			
		} catch (e: any) {
			this._logger.error(`Unable to insert quote: ${e.message}`);
			throw new UnableToAddQuoteError();
		}
	}


	async updateQuote(quote: QuoteRegistry): Promise<void> {
		const existingQuote = await this.getQuoteById(quote.quoteId);

		if(!existingQuote || !existingQuote.quoteId) {
			throw new NonExistingQuoteError("Quote doesn't exist");
		}
			
		try {
			await this.quotes.updateOne({
				quoteId: quote.quoteId,
			}, { $set: quote });
		} catch (e: any) {
			this._logger.error(`Unable to insert quote: ${e.message}`);
			throw new UnableToUpdateQuoteError();
		}
	}

	async removeQuote(quoteId: string): Promise<void> {
		const deleteResult = await this.quotes.deleteOne({quoteId}).catch((e: any) => {
			this._logger.error(`Unable to delete quote: ${e.message}`);
			throw new UnableToDeleteQuoteError();
		});
		if(deleteResult.deletedCount == 1){
			return;
		}
		else{
			throw new NoSuchQuoteError();
		}
	}

	async getQuoteById(quoteId:string):Promise<QuoteRegistry|null>{
		const quote = await this.quotes.findOne({quoteId: quoteId }).catch((e: any) => {
			this._logger.error(`Unable to get quote by id: ${e.message}`);
			throw new UnableToGetQuoteError();
		});
		if(!quote){
			return null;
		} 
		return this.mapToQuote(quote);
	}

	private async checkIfQuoteExists(quote: QuoteRegistry) {
		const quoteAlreadyPresent: WithId<Document> | null = await this.quotes.findOne(
			{
				quoteId: quote.quoteId,
				transactionId: quote.transactionId
			}
		).catch((e: any) => {
			this._logger.error(`Unable to add quote: ${e.message}`);
			throw new UnableToGetQuoteError();
		});

		if (quoteAlreadyPresent) {
			throw new QuoteAlreadyExistsError();
		}
	}

	private mapToQuote(quote: WithId<Document>): QuoteRegistry {
		const quoteMapped:Partial<QuoteRegistry> = { 
			quoteId: quote.quoteId,
			transactionId: quote.transactionId,
			payee: quote.payee,
			payer: quote.payer,
			amountType: quote.amountType,
			amount: quote.amount,
			transactionType: quote.transactionType,
			feesPayer: quote.feesPayer,
			transactionRequestId: quote.transactionRequestId,
			geoCode: quote.geoCode,
			note: quote.note,
			expiration: quote.expiration,
			extensionList: quote.extensionList,
			status: quote.status,
			transferAmount: quote.transferAmount,
			ilpPacket: quote.ilpPacket,
			condition: quote.condition
		};
		return quoteMapped as QuoteRegistry;
	}
}
