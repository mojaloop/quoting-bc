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

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { IQuote, IBulkQuote, QuotingSearchResults } from "@mojaloop/quoting-bc-public-types-lib";

export interface IQuoteRepo {
  init(): Promise<void>;
  destroy(): Promise<void>;
  // addQuote(quote: IQuote): Promise<string>;
  // addQuotes(quotes: IQuote[]): Promise<void>;
  // updateQuote(quote: IQuote): Promise<void>;
  // updateQuotes(quote: IQuote[]): Promise<void>;
  // removeQuote(id: string): Promise<void>;
  getQuoteById(id: string): Promise<IQuote | null>;
  // getQuotes(): Promise<IQuote[]>;
  getQuotesByBulkQuoteId(
    id: string
  ): Promise<IQuote[]>;

  storeQuotes(quotes:IQuote[]):Promise<void>;

  searchQuotes(
    amountType: string | null,
    transactionType: string | null,
    quoteId: string | null,
    transactionId: string | null,
    bulkQuoteId: string | null,
    payerId: string | null,
    payeeId: string | null,
    status: string | null,
    pageIndex?: number,
    pageSize?: number
  ): Promise<QuotingSearchResults>;

  getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>
}

export interface IBulkQuoteRepo {
  init(): Promise<void>;
  destroy(): Promise<void>;
  addBulkQuote(bulkQuote: IBulkQuote): Promise<string>;
  updateBulkQuote(bulkQuote: IBulkQuote): Promise<void>;
  removeBulkQuote(id: string): Promise<void>;
  getBulkQuoteById(id: string): Promise<IBulkQuote | null>;
  getBulkQuotes(): Promise<IBulkQuote[]>;
}

export interface IParticipantService {
  getParticipantInfo(fspId: string): Promise<IParticipant | null>;
  // getParticipantsInfo(fspIds: string[]): Promise<IParticipant[]>;
}


export type AccountLookupBulkQuoteFspIdRequest = { [key:string] : {
    partyType:string,
    partyId: string,
    currency:string | null}
};

export interface IAccountLookupService {
    getAccountLookup(partyType:string, partyId:string, currency:string | null): Promise<string| null>;
}
