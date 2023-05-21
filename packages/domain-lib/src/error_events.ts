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

import {QuoteBCBulkQuoteNotFoundErrorEvent,
    QuoteBCBulkQuoteNotFoundErrorPayload, QuoteBCUnknownErrorEvent, QuoteBCUnknownErrorPayload,
    QuoteBCInvalidMessagePayloadErrorPayload, QuoteBCDuplicateQuoteErrorEvent, QuoteBCDuplicateQuoteErrorPayload,
    QuoteBCInvalidMessagePayloadErrorEvent,
    QuoteBCInvalidMessageTypeErrorEvent, QuoteBCInvalidMessageTypeErrorPayload,
    QuoteBCParticipantNotFoundErrorEvent, QuoteBCInvalidRequesterFspIdErrorEvent, QuoteBCInvalidDestinationFspIdErrorEvent,
    QuoteBCRequiredParticipantIsNotActiveErrorEvent,
    QuoteBCBulkQuoteExpiredErrorPayload, QuoteBCBulkQuoteExpiredErrorEvent,
    QuoteBCUnableToAddQuoteToDatabaseErrorPayload, QuoteBCUnableToAddQuoteToDatabaseErrorEvent,
    QuoteBCQuoteExpiredErrorPayload, QuoteBCQuoteExpiredErrorEvent,
    QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload, QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent,
    QuoteBCInvalidDestinationFspIdErrorPayload, QuoteBCInvalidRequesterFspIdErrorPayload, QuoteBCParticipantNotFoundErrorPayload, QuoteBCQuoteNotFoundErrorEvent, QuoteBCQuoteNotFoundErrorPayload, QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload, QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent, QuoteBCeUnableToUpdateBulkQuoteInDatabaseErrorPayload, QuoteBCeUnableToUpdateBulkQuoteInDatabaseErrorEvent, QuoteBCInvalidBulkQuoteLengthErrorPayload, QuoteBCInvalidBulkQuoteLengthErrorEvent, QuoteBCQuoteRuleSchemeViolatedErrorPayload, QuoteBCQuoteRuleSchemeViolatedErrorEvent
} from "@mojaloop/platform-shared-lib-public-messages-lib";

export function createInvalidMessagePayloadErrorEvent(errorDescription:string, fspId:string, quoteId: string, bulkQuoteId:string ): QuoteBCInvalidMessagePayloadErrorEvent {
    const errorPayload: QuoteBCInvalidMessagePayloadErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };

    const errorEvent = new QuoteBCInvalidMessagePayloadErrorEvent(errorPayload);
    return errorEvent;
}

export function createInvalidMessageTypeErrorEvent(errorDescription:string, fspId:string, quoteId: string, bulkQuoteId:string): QuoteBCInvalidMessageTypeErrorEvent{
    const errorPayload: QuoteBCInvalidMessageTypeErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCInvalidMessageTypeErrorEvent(errorPayload);
    return errorEvent;
}

//TODO: Create the event
export function createInvalidMessageNameErrorEvent(errorDescription:string, fspId:string, quoteId: string, bulkQuoteId:string): any
{
    return null;
}

export function createBulkQuoteNotFoundErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string): QuoteBCBulkQuoteNotFoundErrorEvent {
    const errorPayload: QuoteBCBulkQuoteNotFoundErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId
    };
    const errorEvent = new QuoteBCBulkQuoteNotFoundErrorEvent(errorPayload);
    return errorEvent;
}

export function createQuoteNotFoundErrorEvent(errorDescription:string, fspId:string, quoteId:string): QuoteBCQuoteNotFoundErrorEvent{
    const errorPayload: QuoteBCQuoteNotFoundErrorPayload = {
        quoteId,
        errorDescription,
        fspId
    };
    const errorEvent = new QuoteBCQuoteNotFoundErrorEvent(errorPayload);
    return errorEvent;
}

export function createQuoteDuplicateErrorEvent(errorDescription:string, fspId:string, quoteId:string):QuoteBCDuplicateQuoteErrorEvent {
    const errorPayload: QuoteBCDuplicateQuoteErrorPayload = {
        quoteId,
        errorDescription,
        fspId
    };
    const errorEvent = new QuoteBCDuplicateQuoteErrorEvent(errorPayload);
    return errorEvent;
}

export function createParticipantNotFoundErrorEvent(errorDescription:string, fspId:string, quoteId:string | null, bulkQuoteId:string | null): QuoteBCParticipantNotFoundErrorEvent {
    const errorPayload: QuoteBCParticipantNotFoundErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCParticipantNotFoundErrorEvent(errorPayload);
    return errorEvent;

}

export function createInvalidRequesterFspIdErrorEvent(errorDescription:string, fspId:string, quoteId:string|null, bulkQuoteId:string|null):QuoteBCInvalidRequesterFspIdErrorEvent{
    const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(errorPayload);
    return errorEvent;

}

export function createInvalidDestinationFspIdErrorEvent(errorDescription:string, fspId:string, quoteId:string|null, bulkQuoteId:string|null):QuoteBCInvalidDestinationFspIdErrorEvent{
    const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };

    const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(errorPayload);
    return errorEvent;

}

export function createUnknownErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string): QuoteBCUnknownErrorEvent{
    const errorPayload: QuoteBCUnknownErrorPayload = {
        bulkQuoteId,
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCUnknownErrorEvent(errorPayload);
    return errorEvent;

}

//TODO: Add following errors to shared lib
export function createQuoteExpiredErrorEvent(errorDescription:string, fspId:string, quoteId:string): QuoteBCQuoteExpiredErrorEvent {
    const errorPayload : QuoteBCQuoteExpiredErrorPayload = {
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCQuoteExpiredErrorEvent(errorPayload);
    return errorEvent;
}

export function createExpiredBulkQuoteErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string): QuoteBCBulkQuoteExpiredErrorEvent {
    const errorPayload : QuoteBCBulkQuoteExpiredErrorPayload = {
        errorDescription,
        fspId,
        bulkQuoteId
    };
    const errorEvent = new QuoteBCBulkQuoteExpiredErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnableToAddQuoteToDatabaseErrorEvent(errorDescription:string, fspId:string, quoteId:string): QuoteBCUnableToAddQuoteToDatabaseErrorEvent {
    const errorPayload : QuoteBCUnableToAddQuoteToDatabaseErrorPayload = {
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCUnableToAddQuoteToDatabaseErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnableToAddBulkQuoteToDatabaseErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string): QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent {
    const errorPayload : QuoteBCUnableToAddBulkQuoteToDatabaseErrorPayload = {
        errorDescription,
        fspId,
        bulkQuoteId
    };
    const errorEvent = new QuoteBCUnableToAddBulkQuoteToDatabaseErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnableToUpdateQuoteInDatabaseErrorEvent(errorDescription:string, fspId:string, quoteId:string): QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent{
    const errorPayload : QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload = {
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnableToUpdateBulkQuoteInDatabaseErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string): QuoteBCeUnableToUpdateBulkQuoteInDatabaseErrorEvent{
    const errorPayload : QuoteBCeUnableToUpdateBulkQuoteInDatabaseErrorPayload = {
        errorDescription,
        fspId,
        bulkQuoteId
    };
    const errorEvent = new QuoteBCeUnableToUpdateBulkQuoteInDatabaseErrorEvent(errorPayload);
    return errorEvent;
}

export function createInvalidBulkQuoteLengthErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string): QuoteBCInvalidBulkQuoteLengthErrorEvent {
    const errorPayload : QuoteBCInvalidBulkQuoteLengthErrorPayload = {
        errorDescription,
        fspId,
        bulkQuoteId
    };
    const errorEvent = new QuoteBCInvalidBulkQuoteLengthErrorEvent(errorPayload);
    return errorEvent;
}

export function createQuoteRuleSchemeViolated(errorDescription:string, fspId:string, quoteId:string): QuoteBCQuoteRuleSchemeViolatedErrorEvent{
    const errorPayload : QuoteBCQuoteRuleSchemeViolatedErrorPayload = {
        errorDescription,
        fspId,
        quoteId
    };
    const errorEvent = new QuoteBCQuoteRuleSchemeViolatedErrorEvent(errorPayload);
    return errorEvent;
}


