/**
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import {
  IQuoteRepo,
  IQuote,
  QuoteStatus,
} from "@mojaloop/quoting-bc-domain-lib";

export class MemoryQuoteRepo implements IQuoteRepo {
  private readonly _logger: ILogger;
  private readonly _quotes: IQuote[] = [];

  constructor(logger: ILogger) {
    this._logger = logger;
  }

  init(): Promise<void> {
    return Promise.resolve();
  }
  destroy(): Promise<void> {
    return Promise.resolve();
  }
  addQuote(quote: IQuote): Promise<string> {
    this._quotes.push(quote);
    return Promise.resolve(quote.quoteId);
  }
  addQuotes(quotes: IQuote[]): Promise<void> {
    this._quotes.push(...quotes);
    return Promise.resolve();
  }

  updateQuote(quote: IQuote): Promise<void> {
    const quoteToUpdate = this._quotes.find((q) => q.quoteId === quote.quoteId);
    if (quoteToUpdate) {
      Object.assign(quoteToUpdate, quote);
    } else {
      throw new Error(`Quote with id ${quote.quoteId} not found`);
    }
    return Promise.resolve();
  }
  removeQuote(id: string): Promise<void> {
    this._quotes.splice(
      this._quotes.findIndex((q) => q.quoteId === id),
      1
    );
    return Promise.resolve();
  }
  getQuoteById(id: string): Promise<IQuote | null> {
    return Promise.resolve(this._quotes.find((q) => q.quoteId === id) || null);
  }

  getQuotesByBulkQuoteIdAndStatus(
    id: string,
    status: QuoteStatus
  ): Promise<IQuote[]> {
    return Promise.resolve(
      this._quotes.filter((q) => q.bulkQuoteId === id && q.status === status)
    );
  }

  getQuotes(): Promise<IQuote[]> {
    return Promise.resolve(this._quotes);
  }

  searchQuotes(
    transactionId?: string | undefined,
    quoteId?: string | undefined,
    amountType?: string | undefined,
    transactionType?: string | undefined
  ): Promise<IQuote[] | null> {
    return Promise.resolve(
      this._quotes.filter(
        (quote) =>
          quote.quoteId === quoteId ||
          quote.transactionId === transactionId ||
          quote.amountType === amountType ||
          quote.transactionType.scenario === transactionType
      )
    );
  }
}
