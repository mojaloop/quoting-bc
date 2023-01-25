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

import { IMessage, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { QuoteResponseReceivedEvtPayload, QuoteRequestReceivedEvtPayload, BulkQuotePendingReceivedEvt, BulkQuotePendingReceivedEvtPayload, BulkQuoteRequestedEvtPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IBulkQuote } from "../../dist";
import { IMoney, IQuote } from '../../src/types';

export function createQuoteResponseReceivedEvtPayload(mockedQuote: IQuote): QuoteResponseReceivedEvtPayload {
    return {
        expiration: mockedQuote.expiration as string,
        geoCode: mockedQuote.geoCode,
        quoteId: mockedQuote.quoteId,
        extensionList: mockedQuote.extensionList,
        condition: mockedQuote.condition as string,
        ilpPacket: mockedQuote.ilpPacket as string,
        transferAmount: mockedQuote.totalTransferAmount as IMoney,
        payeeFspCommission: mockedQuote.payeeFspCommission as IMoney,
        payeeFspFee: mockedQuote.payeeFspFee as IMoney,
        payeeReceiveAmount: mockedQuote.payeeReceiveAmount as IMoney,
    };
}

export function createQuoteRequestReceivedEvtPayload(mockedQuote: IQuote): QuoteRequestReceivedEvtPayload {
    return {
        amount: mockedQuote.amount,
        expiration: mockedQuote.expiration,
        geoCode: mockedQuote.geoCode,
        payee: mockedQuote.payee,
        payer: mockedQuote.payer,
        quoteId: mockedQuote.quoteId,
        transactionId: mockedQuote.transactionId,
        amountType: mockedQuote.amountType,
        note: mockedQuote.note,
        extensionList: mockedQuote.extensionList,
        fees: mockedQuote.feesPayer,
        transactionType: mockedQuote.transactionType,
        transactionRequestId: mockedQuote.transactionRequestId,
    };
}

export function createBulkQuoteRequestedEvtPayload(mockedBulkQuote: IBulkQuote): BulkQuoteRequestedEvtPayload {
    return {
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        payer: mockedBulkQuote.payer,
        geoCode: mockedBulkQuote.geoCode,
        expiration: mockedBulkQuote.expiration,
        individualQuotes: mockedBulkQuote.individualQuotes as any,
        extensionList: mockedBulkQuote.extensionList
    }
}

export function createBulkQuotePendingReceivedEvtPayload(mockedBulkQuote: IBulkQuote): BulkQuotePendingReceivedEvtPayload {
    return {
        bulkQuoteId: mockedBulkQuote.bulkQuoteId,
        expiration: mockedBulkQuote.expiration,
        extensionList: mockedBulkQuote.extensionList,
        individualQuoteResults: mockedBulkQuote.individualQuotes as any,
      }
}

export function createMessage(payload: object | null, messageName:string, fspiopOpaqueState:object|null): IMessage {
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