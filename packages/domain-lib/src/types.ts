import { QuoteBCQuoteNotFoundErrorEvent } from '@mojaloop/platform-shared-lib-public-messages-lib';
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

import {QuoteBCBulkQuoteNotFoundErrorEvent, QuoteBCUnknownErrorEvent,
    QuoteBCInvalidMessagePayloadErrorEvent, QuoteBCDuplicateQuoteErrorEvent, QuoteBCInvalidDestinationPartyInformationErrorEvent,
    QuoteBCInvalidMessageTypeErrorEvent, QuoteBCParticipantNotFoundErrorEvent,
    QuoteBCInvalidParticipantIdErrorEvent, QuoteBCInvalidRequesterFspIdErrorEvent, QuoteBCInvalidDestinationFspIdErrorEvent,
    QuoteBCRequiredParticipantIsNotActiveErrorEvent } from "@mojaloop/platform-shared-lib-public-messages-lib";

export enum QuoteStatus {
    RECEIVED = "RECEIVED",
    PENDING = "PENDING",
    REJECTED = "REJECTED",
    ACCEPTED = "ACCEPTED",
    EXPIRED = "EXPIRED"
}

export interface IPartyComplexName {
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
}

export interface IPartyPersonalInfo {
    complexName: IPartyComplexName | null;
    dateOfBirth: string | null
}

export interface IPartyIdInfo {
    partyIdType: string
    partyIdentifier: string
    partySubIdOrType: string | null
    fspId: string | null
}

export interface IParty {
    partyIdInfo: IPartyIdInfo;
    merchantClassificationCode: string | null;
    name: string | null;
    personalInfo: IPartyPersonalInfo | null;
}

export interface IMoney {
    currency: string;
    amount: string
}

export interface IRefund {
    originalTransactionId: string;
    refundReason: string | null;
}

export interface ITransactionType {
    scenario: string
    subScenario: string | null
    initiator: string
    initiatorType: string
    refundInfo: IRefund | null,
    balanceOfPayments: string | null
}

export type IAmountType = "SEND" | "RECEIVE";

export interface IGeoCode {
    latitude: string;
    longitude: string;
}
export interface IExtensionList {
    extension: { key: string; value: string;}[];
}

export interface IErrorInformation {
    errorCode: string;
    errorDescription: string;
    extensionList: IExtensionList
}

export interface IParticipant {
    id: string;
    type: string;
    subId: string | null;
    isActive: boolean;
}

export interface IQuote {
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
    extensionList: IExtensionList | null;
    errorInformation: IErrorInformation | null;
    status: QuoteStatus | null;
    totalTransferAmount: IMoney | null;
    ilpPacket: string | null;
    condition: string | null;
    payeeReceiveAmount: IMoney | null;
    payeeFspFee: IMoney | null;
    payeeFspCommission: IMoney | null;
    transferAmount : IMoney | null;
}
export interface IBulkQuote {
    bulkQuoteId: string;
    payer: IParty;
    geoCode: IGeoCode | null;
    expiration: string | null;
    individualQuotes: IQuote[];
    quotesNotProcessedIds: string[];
    extensionList: IExtensionList | null;
    status: QuoteStatus | null;
}

export type QuoteUpdatableFields = Pick<IQuote, "transferAmount" | "expiration" | "ilpPacket" | "condition"
    | "payeeReceiveAmount" | "payeeFspFee" | "payeeFspCommission" | "geoCode" | "extensionList">;


export type QuoteErrorEvent = QuoteBCBulkQuoteNotFoundErrorEvent | QuoteBCUnknownErrorEvent |
    QuoteBCInvalidMessagePayloadErrorEvent | QuoteBCDuplicateQuoteErrorEvent | QuoteBCInvalidDestinationPartyInformationErrorEvent |
    QuoteBCInvalidMessageTypeErrorEvent  | QuoteBCParticipantNotFoundErrorEvent |
    QuoteBCInvalidParticipantIdErrorEvent | QuoteBCInvalidRequesterFspIdErrorEvent | QuoteBCInvalidDestinationFspIdErrorEvent |
    QuoteBCRequiredParticipantIsNotActiveErrorEvent | QuoteBCQuoteNotFoundErrorEvent;



