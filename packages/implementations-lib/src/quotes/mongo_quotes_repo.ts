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
  NoSuchQuoteError,
  UnableToUpdateQuoteError,
  UnableToAddManyQuotesError,
  UnableToGetQuotesError,
} from "../errors";
import {
  IQuoteRepo,
  IQuote,
  QuoteStatus,
} from "@mojaloop/quoting-bc-domain-lib";
import { randomUUID } from "crypto";

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
      throw new UnableToInitQuoteRegistryError();
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.mongoClient.close();
    } catch (e: unknown) {
      this._logger.error(
        `Unable to close the database connection: ${(e as Error).message}`
      );
      throw new UnableToCloseDatabaseConnectionError();
    }
  }

  async addQuote(quote: IQuote): Promise<string> {
    const quoteToAdd = { ...quote };
    if (quoteToAdd.quoteId) {
      await this.checkIfQuoteExists(quote);
    }

    quoteToAdd.quoteId = quoteToAdd.quoteId || randomUUID();
    await this.quotes.insertOne(quoteToAdd).catch((e: unknown) => {
      this._logger.error(`Unable to insert quote: ${(e as Error).message}`);
      throw new UnableToAddQuoteError();
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
      throw new UnableToAddManyQuotesError();
    });
  }

  async updateQuote(quote: IQuote): Promise<void> {
    const existingQuote = await this.getQuoteById(quote.quoteId);

    if (!existingQuote || !existingQuote.quoteId) {
      throw new NoSuchQuoteError();
    }

    const updatedQuote: IQuote = { ...existingQuote, ...quote };
    updatedQuote.quoteId = existingQuote.quoteId;

    await this.quotes
      .updateOne({ quoteId: quote.quoteId }, { $set: updatedQuote })
      .catch((e: unknown) => {
        this._logger.error(`Unable to insert quote: ${(e as Error).message}`);
        throw new UnableToUpdateQuoteError();
      });
  }

  async removeQuote(quoteId: string): Promise<void> {
    const deleteResult = await this.quotes
      .deleteOne({ quoteId })
      .catch((e: unknown) => {
        this._logger.error(`Unable to delete quote: ${(e as Error).message}`);
        throw new UnableToDeleteQuoteError();
      });

    if (deleteResult.deletedCount == 1) {
      return;
    } else {
      throw new NoSuchQuoteError();
    }
  }

  async getQuoteByTransactionId(transactionId: string): Promise<IQuote | null> {
    const quote = await this.quotes
      .findOne({ transactionId: transactionId })
      .catch((e: unknown) => {
        this._logger.error(
          `Unable to get quote by transactionId: ${(e as Error).message}`
        );
        throw new UnableToGetQuoteError();
      });

    if (!quote) {
      return null;
    }
    return this.mapToQuote(quote);
  }

  async getQuoteById(quoteId: string): Promise<IQuote | null> {
    const quote = await this.quotes
      .findOne({ quoteId: quoteId })
      .catch((e: unknown) => {
        this._logger.error(
          `Unable to get quote by id: ${(e as Error).message}`
        );
        throw new UnableToGetQuoteError();
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
        this._logger.error(`Unable to get quotes: ${(e as Error).message}`);
        throw new UnableToGetQuotesError();
      });

    const mappedQuotes = [];

    for (const quote of quotes) {
      mappedQuotes.push(this.mapToQuote(quote));
    }

    return mappedQuotes;
  }

  async searchQuotes(
    id?: string,
    quoteId?: string,
    amountType?: string,
    transactionType?: string
  ): Promise<IQuote[]> {
    const filter: any = { $and: [] };
    if (id) {
      filter.$and.push({ transactionId: { $regex: id, $options: "i" } });
    }
    if (quoteId) {
      filter.$and.push({ quoteId });
    }
    if (amountType) {
      filter.$and.push({ amountType });
    }
    if (transactionType) {
      filter.$and.push({ "transactionType.scenario": transactionType });
    }

    const quotes = await this.quotes
      .find(filter, { sort: ["updatedAt", "desc"], projection: { _id: 0 } })
      .toArray()
      .catch((e: unknown) => {
        this._logger.error(`Unable to get transfers: ${(e as Error).message}`);
        throw new UnableToGetQuotesError();
      });

    const mappedTransfers = quotes.map(this.mapToQuote);

    return mappedTransfers;
  }

  async getQuotesByBulkQuoteIdAndStatus(
    bulkQuoteId: string,
    status: QuoteStatus
  ): Promise<IQuote[]> {
    const quotes = await this.quotes
      .find({
        bulkQuoteId: bulkQuoteId,
        status,
      })
      .toArray()
      .catch((e: unknown) => {
        this._logger.error(
          `Unable to get quotes by bulk quote id: ${(e as Error).message}`
        );
        throw new UnableToGetQuotesError();
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
        this._logger.error(`Unable to add quote: ${(e as Error).message}`);
        throw new UnableToGetQuoteError();
      });

    if (quoteAlreadyPresent) {
      throw new QuoteAlreadyExistsError();
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
    };
    return quoteMapped;
  }
}
