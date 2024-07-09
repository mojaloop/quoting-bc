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

/* istanbul ignore file */

import { IQuote, IBulkQuote, IParty, IAmountType, IMoney, ITransactionType, IGeoCode, IErrorInformation, QuoteState } from "@mojaloop/quoting-bc-public-types-lib";

/** Quote entity **/
/* istanbul ignore next */
export class Quote implements IQuote {
    createdAt: number;
	updatedAt: number;
    requesterFspId:string;
    destinationFspId:string;
    quoteId: string;
    bulkQuoteId: string | null;
    transactionId: string;
    payee: IParty;
    payer: IParty;
    amountType: IAmountType;
    amount: IMoney;
    transactionType: ITransactionType;
    feesPayer: IMoney | null;
    transactionRequestId: string | null;
    geoCode: IGeoCode | null;
    note: string | null;
    expiration: string | null;
    errorInformation: IErrorInformation | null;
    status: QuoteState | null;
    totalTransferAmount: IMoney | null;
    payeeReceiveAmount: IMoney | null;
    payeeFspFee: IMoney | null;
    payeeFspCommission: IMoney | null;
    transferAmount : IMoney | null;
    // Protocol Specific
    fspiopOpaqueState: any | null;
}

/** BulkQuote entity **/
/* istanbul ignore next */
export class BulkQuote implements IBulkQuote {
    createdAt: number;
	updatedAt: number;
    bulkQuoteId: string;
    payer: IParty;
    geoCode: IGeoCode | null;
    expiration: string | null;
    individualQuotes: IQuote[];
    quotesNotProcessedIds: string[];
    status: QuoteState | null;
    // Protocol Specific
    fspiopOpaqueState: any | null;
}
