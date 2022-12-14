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

import { Participant } from "@mojaloop/participant-bc-public-types-lib";
import {IQuote, IBulkQuote } from "../types";
export interface IQuoteRepo {
    init(): Promise<void>;
	destroy(): Promise<void>;
    addQuote(quote: IQuote):Promise<string>;
    addQuotes(quotes: IQuote[]):Promise<void>;
    updateQuote(quote: IQuote):Promise<void>;
    removeQuote(id: string):Promise<void>;
    getQuoteById(id:string):Promise<IQuote|null>;
}

export interface IBulkQuoteRepo {
    init(): Promise<void>;
	destroy(): Promise<void>;
    addBulkQuote(bulkQuote: IBulkQuote):Promise<string>;
    updateBulkQuote(bulkQuote: IBulkQuote):Promise<void>;
    removeBulkQuote(id: string):Promise<void>;
    getBulkQuoteById(id:string):Promise<IBulkQuote|null>;
}

export interface IParticipantService { 
    getParticipantInfo(fspId: string): Promise<Participant| null>;
    getParticipantsInfo(fspIds: string[]): Promise<Participant[]|null>;
}


export type AccountLookupBulkQuoteFspIdRequest = { [key:string] : { partyId: string, partyType:string, partySubType: string | null, currency:string | null} };

export interface IAccountLookupService {
    getAccountLookup(partyId:string, partyType:string, partySubIdOrType:string | null, currency:string | null): Promise<string| null>;
    getBulkAccountLookup( partyIdentifiersList: AccountLookupBulkQuoteFspIdRequest): Promise<{[key:string]:string | null} | null>;
}

