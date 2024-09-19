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
    CommandMsg,
    IMessage,
    MessageTypes,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    QuoteResponseReceivedEvtPayload,
    QuoteRequestReceivedEvtPayload,
    BulkQuotePendingReceivedEvtPayload,
    BulkQuoteRequestedEvtPayload,
    QuoteRejectedEvtPayload,
    BulkQuoteQueryReceivedEvtPayload,
    QuoteQueryReceivedEvtPayload,
    BulkQuoteRejectedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote, IMoney, IQuote } from "@mojaloop/quoting-bc-public-types-lib";

export function createQuoteResponseReceivedEvtPayload(
    mockedQuote: IQuote,
    override: any = {}
): QuoteResponseReceivedEvtPayload {
    const quote = Object.assign({}, mockedQuote, override);
    return {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        expiration: quote.expiration as string,
        note: quote.note,
        geoCode: quote.geoCode,
        quoteId: quote.quoteId,
        transferAmount: quote.totalTransferAmount as IMoney,
        payeeFspCommission: quote.payeeFspCommission as IMoney,
        payeeFspFee: quote.payeeFspFee as IMoney,
        payeeReceiveAmount: quote.payeeReceiveAmount as IMoney,
        extensions: quote.extensions,
        ...override
    };
}

export function createQuoteRequestReceivedEvtPayload(
    mockedQuote: IQuote,
    override: any = {}
): QuoteRequestReceivedEvtPayload {
    // create a copy without reference to the original object with JSON parse/stringify
    const quote = Object.assign({}, mockedQuote, override);

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
        fees: quote.feesPayer,
        transactionType: quote.transactionType,
        transactionRequestId: quote.transactionRequestId,
        converter: null, 
        currencyConversion: null,
        extensions: quote.extensions,
        ...override
    };
}

export function createQuoteQueryReceivedEvtPayload(
    mockedQuote: IQuote,
    override: any = {}
): QuoteQueryReceivedEvtPayload {
    const quote = Object.assign({}, mockedQuote, override);
    return {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        quoteId: quote.quoteId,
        ...override
    };
}

export function createQuoteQueryRejectedEvtPayload(
    mockedQuote: IQuote,
    override: any = {}
): QuoteRejectedEvtPayload {
    const quote = Object.assign({}, mockedQuote, override);
    return {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        quoteId: quote.quoteId,
        errorInformation: quote.errorInformation as any,
        ...override
    };
}

export function createBulkQuoteRequestedEvtPayload(
    bulkQuote: IBulkQuote,
    override: any = {},
    deleteProps: string[] = []
): BulkQuoteRequestedEvtPayload {
    const mockedBulkQuote = Object.assign({}, bulkQuote, override);
    const payload = {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        payer: mockedBulkQuote.payer,
        geoCode: mockedBulkQuote.geoCode,
        expiration: mockedBulkQuote.expiration,
        individualQuotes: mockedBulkQuote.individualQuotes,
        extensions: mockedBulkQuote.extensions,
        ...override
    };

    deleteProps.forEach(prop => {
        delete payload[prop];
    });

    return payload;
}

export function createBulkQuotePendingReceivedEvtPayload(
    bulkQuote: IBulkQuote,
    override: any = {},
    deleteProps: string[] = []
): BulkQuotePendingReceivedEvtPayload {
    const mockedBulkQuote = Object.assign({}, bulkQuote, override);
    const payload = {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        expiration: mockedBulkQuote.expiration,
        individualQuoteResults: mockedBulkQuote.individualQuotes,
        extensions: mockedBulkQuote.extensions,
        ...override
    };

    deleteProps.forEach(prop => {
        delete payload[prop];
    });

    return payload;
}

export function createBulkQuoteQueryReceivedEvtPayload(
    mockedBulkQuote: IBulkQuote,
    override: any = {}
): BulkQuoteQueryReceivedEvtPayload {
    const bulkQuote = Object.assign({}, mockedBulkQuote, override);
    return {
        bulkQuoteId: bulkQuote.bulkQuoteId,
        ...override
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
    },
    override: any = {}
): BulkQuoteRejectedEvtPayload {
    const bulkQuote = Object.assign({}, mockedBulkQuote, override);
    return {
        requesterFspId: "randomRequesterFspId",
		destinationFspId: "randomDestinationFspId",
        bulkQuoteId: bulkQuote.bulkQuoteId,
        errorInformation,
        ...override
    };
}

export function createMessage(
    payload: object | null,
    messageName: string,
    inboundProtocolOpaqueState: object | null
): IMessage {
    return {
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState,
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

export function createCommand(
    payload: object|null, 
    messageName: string|null, 
    inboundProtocolOpaqueState: object|null, 
    msgType: MessageTypes = MessageTypes.COMMAND
): CommandMsg {
    return {
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState,
        msgId: "fake msg id",
        msgKey: "fake msg key",
        msgTopic: "fake msg topic",
        msgName: messageName as string,
        msgOffset: 0,
        msgPartition: 0,
        msgTimestamp: 0,
        msgType: msgType,
        payload,
        aggregateId: "1",
        boundedContextName: "quoting",
        tracingInfo: "123",
        validatePayload: () => { return; }
    };
}