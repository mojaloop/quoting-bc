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
import { IParty, IMoney, ITransactionType, IGeoCode, QuoteStatus, IExtensionList, IAmountType } from "../types";
 
/* infrastructure interfaces */

export type Quote = {
    id: string | null;
    quoteId: string;
    transactionId: string;
    payee: IParty;
    payer: IParty;
    amountType: IAmountType;
    amount: IMoney;
    transactionType: ITransactionType;
    feesPayer: IMoney | null;
    transactionRequestId: string | null;
    geoCodePayer: IGeoCode | null;
    note: string | null;
    expirationPayer: string | null;
    extensionList: IExtensionList | null;
    status: QuoteStatus;
}

export type AddQuoteDTO = {
    id: string | null;
    requesterFspId: string;
    destinationFspId: string;
    quoteId: string;
    transactionId: string;
    payee: IParty;
    payer: IParty;
    amountType: IAmountType;
    amount: IMoney;
    transactionType: ITransactionType;
    feesPayer: IMoney | null;
    transactionRequestId: string | null;
    geoCodePayer: IGeoCode | null;
    note: string | null;
    expirationPayer: string | null;
    extensionList: IExtensionList | null;
    status: QuoteStatus;
}


export type UpdateQuoteDTO = {
    id: string | null;
    requesterFspId: string;
    destinationFspId: string;
    quoteId: string;
    transferAmount: IMoney;
    expiration: string;
    ilpPacket: string;
    condition: string;
    payeeReceiveAmount: IMoney | null;
    payeeFspFee: IMoney | null;
    payeeFspCommission: IMoney | null;
    geoCode: IGeoCode | null;
    extensionList: IExtensionList | null;
    status: QuoteStatus;
}

export interface IQuoteRegistry {
    init(): Promise<void>;
	destroy(): Promise<void>;
    addQuote(quote: Quote):Promise<void>;
    updateQuote(quote: Quote):Promise<void>;
    removeQuote(id: string):Promise<void>;
    getAllQuotes():Promise<Quote[]>;
    getQuoteById(id:string):Promise<Quote|null>;
    getQuote(quoteId:string, transactionId: string | null):Promise<Quote | null>;
}

export interface IParticipantService {
    getParticipantInfo(fspId: string): Promise<Participant| null>;
    getParticipantsInfo(fspIds: string[]): Promise<Participant[]|null>;
}