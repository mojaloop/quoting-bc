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
    IMessage,
    MessageTypes,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    QuoteResponseReceivedEvtPayload,
    QuoteRequestReceivedEvtPayload,
    BulkQuotePendingReceivedEvt,
    BulkQuotePendingReceivedEvtPayload,
    BulkQuoteRequestedEvtPayload,
    GetQuoteQueryRejectedResponseEvtPayload,
    QuoteRejectedEvtPayload,
    BulkQuoteQueryReceivedEvt,
    BulkQuoteQueryReceivedEvtPayload,
    QuoteQueryReceivedEvtPayload,
    BulkQuoteRejectedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IMoney, IQuote } from "@mojaloop/quoting-bc-public-types-lib";

export function createQuoteResponseReceivedEvtPayload(
    mockedQuote: IQuote
): QuoteResponseReceivedEvtPayload {
    const quote = Object.assign({}, mockedQuote);
    return {
        expiration: quote.expiration as string,
        geoCode: quote.geoCode,
        quoteId: quote.quoteId,
        extensionList: quote.extensionList,
        condition: quote.condition as string,
        ilpPacket: quote.ilpPacket as string,
        transferAmount: quote.totalTransferAmount as IMoney,
        payeeFspCommission: quote.payeeFspCommission as IMoney,
        payeeFspFee: quote.payeeFspFee as IMoney,
        payeeReceiveAmount: quote.payeeReceiveAmount as IMoney,
    };
}

export function createQuoteRequestReceivedEvtPayload(
    mockedQuote: IQuote
): QuoteRequestReceivedEvtPayload {
    // create a copy without reference to the original object with JSON parse/stringify
    const quote = Object.assign({}, mockedQuote);

    return {
        amount: quote.amount,
        expiration: quote.expiration,
        geoCode: quote.geoCode,
        payee: quote.payee,
        payer: quote.payer,
        quoteId: quote.quoteId,
        transactionId: quote.transactionId,
        amountType: quote.amountType,
        note: quote.note,
        extensionList: quote.extensionList,
        fees: quote.feesPayer,
        transactionType: quote.transactionType,
        transactionRequestId: quote.transactionRequestId,
        converter: null, 
        currencyConversion: null
    };
}

export function createQuoteQueryReceivedEvtPayload(
    mockedQuote: IQuote
): QuoteQueryReceivedEvtPayload {
    const quote = Object.assign({}, mockedQuote);
    return {
        quoteId: quote.quoteId,
    };
}

export function createQuoteQueryRejectedEvtPayload(
    mockedQuote: IQuote
): QuoteRejectedEvtPayload {
    const quote = Object.assign({}, mockedQuote);
    return {
        quoteId: quote.quoteId,
        errorInformation: quote.errorInformation as any,
    };
}

export function createBulkQuoteRequestedEvtPayload(
    bulkQuote: IBulkQuote
): BulkQuoteRequestedEvtPayload {
    const mockedBulkQuote = Object.assign({}, bulkQuote);
    return {
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        payer: mockedBulkQuote.payer,
        geoCode: mockedBulkQuote.geoCode,
        expiration: mockedBulkQuote.expiration,
        individualQuotes: mockedBulkQuote.individualQuotes as any,
        extensionList: mockedBulkQuote.extensionList,
    };
}

export function createBulkQuotePendingReceivedEvtPayload(
    bulkQuote: IBulkQuote
): BulkQuotePendingReceivedEvtPayload {
    const mockedBulkQuote = Object.assign({}, bulkQuote);
    return {
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        expiration: mockedBulkQuote.expiration,
        extensionList: mockedBulkQuote.extensionList,
        individualQuoteResults: mockedBulkQuote.individualQuotes as any,
    };
}

export function createBulkQuoteQueryReceivedEvtPayload(
    mockedBulkQuote: IBulkQuote
): BulkQuoteQueryReceivedEvtPayload {
    const bulkQuote = Object.assign({}, mockedBulkQuote);
    return {
        bulkQuoteId: bulkQuote.bulkQuoteId,
    };
}

export function createBulkQuoteQueryRejectedEvtPayload(
    mockedBulkQuote: IBulkQuote,
    errorInformation: {
        errorCode: string;
        errorDescription: string;
        extensionList: {
            extension: {
                key: string;
                value: string;
            }[];
        } | null;
    }
): BulkQuoteRejectedEvtPayload {
    const bulkQuote = Object.assign({}, mockedBulkQuote);
    return {
        bulkQuoteId: bulkQuote.bulkQuoteId,
        errorInformation,
    };
}

export function createMessage(
    payload: object | null,
    messageName: string,
    fspiopOpaqueState: object | null
): IMessage {
    return {
        fspiopOpaqueState,
        msgId: "fake msg id",
        msgKey: "fake msg key",
        msgTopic: "fake msg topic",
        msgName: messageName,
        msgOffset: 0,
        msgPartition: 0,
        msgTimestamp: 0,
        msgType: MessageTypes.DOMAIN_EVENT,
        payload,
    };
}
