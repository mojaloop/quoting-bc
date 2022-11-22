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

import { InvalidIdError } from "../errors";
import { IGeoCode, IMoney, IParty, IQuote, ITransactionType, QuoteStatus } from "../types";

export class Quote implements IQuote {
    id: string | null;
    quoteId: string;
    transactionId: string;
    payee: IParty;
    payer: IParty;
    amountType: string;
    amount: IMoney;
    transactionType: ITransactionType;
    feesPayer: IMoney | null;
    transactionRequestId: string | null;
    geoCodePayer: IGeoCode | null;
    note: string | null;
    expirationPayer: string | null;
    extensionList: string | null;
    fees: IMoney | null;
    geoCode: IGeoCode | null;
    expiration: string | null;
    status: QuoteStatus;
    
	constructor(
        id: string | null,
        quoteId: string,
        transactionId: string,
        payee: IParty,
        payer: IParty,
        amountType: string,
        amount: IMoney,
        transactionType: ITransactionType,
        feesPayer: IMoney | null,
        transactionRequestId: string | null,
        geoCodePayer: IGeoCode | null,
        note: string | null,
        expirationPayer: string | null,
        extensionList: string | null,
        fees: IMoney | null,
        geoCode: IGeoCode | null,
        expiration: string | null,
        status: QuoteStatus
	) {
        this.id = id;
        this.quoteId = quoteId;
        this.transactionId = transactionId;
        this.payee = payee;
        this.payer = payer;
        this.amountType = amountType;
        this.amount = amount;
        this.transactionType = transactionType;
        this.feesPayer = feesPayer;
        this.transactionRequestId = transactionRequestId;
        this.geoCodePayer = geoCodePayer;
        this.note = note;
        this.expirationPayer = expirationPayer;
        this.extensionList = extensionList;
        this.fees = fees;
        this.geoCode = geoCode;
        this.expiration = expiration;
        this.status = status;
	}

    static validateQuote(quote: Quote): void {
		if (!quote.id) {
			throw new InvalidIdError();
		}
	}
}
