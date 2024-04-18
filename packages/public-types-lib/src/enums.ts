/*****
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
 should be listed with a '*' in the first column. People who have
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
 ******/

"use strict";

export enum QuoteState {
  RECEIVED = "RECEIVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED"
}

type QuotingErrorCodeKeys = keyof typeof QuotingErrorCodes;

export const QuotingErrorCodes = {
    COMMAND_TYPE_UNKNOWN: "Command type is unknown",
    INVALID_MESSAGE_PAYLOAD: "Invalid message payload",
    INVALID_MESSAGE_TYPE: "Invalid message type",
    INVALID_BULK_QUOTE_LENGTH: "Invalid bulk quote length",
    RULE_SCHEME_VIOLATED_RESPONSE: "Quote request scheme validation failed",
    RULE_SCHEME_VIOLATED_REQUEST: "Quote response scheme validation failed",
    DUPLICATE_QUOTE: "Duplicate quote",
    DUPLICATE_BULK_QUOTE: "Duplicate bulk quote",
    UNABLE_TO_ADD_QUOTE: "Unable to add quote",
    UNABLE_TO_GET_QUOTE: "Unable to get quote",
    UNABLE_TO_ADD_BULK_QUOTE: "Unable to add bulk quote",
    UNABLE_TO_GET_BULK_QUOTE: "Unable to get bulk quote",
    UNABLE_TO_UPDATE_QUOTE: "Unable to update quote",
    UNABLE_TO_UPDATE_BULK_QUOTE: "Unable to update bulk quote",
    QUOTE_NOT_FOUND: "Quote not found",
    BULK_QUOTE_NOT_FOUND: "Bulk quote not found",
    INVALID_DESTINATION_PARTICIPANT: "Invalid payee participant",
    INVALID_SOURCE_PARTICIPANT: "Invalid payer participant",
    SOURCE_PARTICIPANT_NOT_FOUND: "Payer participant not found",
    DESTINATION_PARTICIPANT_NOT_FOUND: "Payee participant not found",
    QUOTE_EXPIRED: "Quote expired",
    BULK_QUOTE_EXPIRED: "Bulk quote expired",
    REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH: "Payer participant id mismatch",
    REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED: "Payer participant not approved",
    REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE: "Payer participant not active",
    REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH: "Payee participant id mismatch",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED: "Payee participant not approved",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE: "Payee participant not approved",
    INDIVIDUAL_QUOTES_NOT_FOUND: "Individual quotes for bulk quote not found"
} as const;

export const QuotingErrorCodeNames: {
    [K in QuotingErrorCodeKeys]: K;
  } = {
    COMMAND_TYPE_UNKNOWN: "COMMAND_TYPE_UNKNOWN",
    INVALID_MESSAGE_PAYLOAD: "INVALID_MESSAGE_PAYLOAD",
    INVALID_MESSAGE_TYPE: "INVALID_MESSAGE_TYPE",
    INVALID_BULK_QUOTE_LENGTH: "INVALID_BULK_QUOTE_LENGTH",
    RULE_SCHEME_VIOLATED_RESPONSE: "RULE_SCHEME_VIOLATED_RESPONSE",
    RULE_SCHEME_VIOLATED_REQUEST: "RULE_SCHEME_VIOLATED_REQUEST",
    DUPLICATE_QUOTE: "DUPLICATE_QUOTE",
    DUPLICATE_BULK_QUOTE: "DUPLICATE_BULK_QUOTE",
    UNABLE_TO_ADD_QUOTE: "UNABLE_TO_ADD_QUOTE",
    UNABLE_TO_GET_QUOTE: "UNABLE_TO_GET_QUOTE",
    UNABLE_TO_ADD_BULK_QUOTE: "UNABLE_TO_ADD_BULK_QUOTE",
    UNABLE_TO_GET_BULK_QUOTE: "UNABLE_TO_GET_BULK_QUOTE",
    UNABLE_TO_UPDATE_QUOTE: "UNABLE_TO_UPDATE_QUOTE",
    UNABLE_TO_UPDATE_BULK_QUOTE: "UNABLE_TO_UPDATE_BULK_QUOTE",
    QUOTE_NOT_FOUND: "QUOTE_NOT_FOUND",
    BULK_QUOTE_NOT_FOUND: "BULK_QUOTE_NOT_FOUND",
    INVALID_DESTINATION_PARTICIPANT: "INVALID_DESTINATION_PARTICIPANT",
    INVALID_SOURCE_PARTICIPANT: "INVALID_SOURCE_PARTICIPANT",
    SOURCE_PARTICIPANT_NOT_FOUND: "SOURCE_PARTICIPANT_NOT_FOUND",
    DESTINATION_PARTICIPANT_NOT_FOUND: "DESTINATION_PARTICIPANT_NOT_FOUND",
    QUOTE_EXPIRED: "QUOTE_EXPIRED",
    BULK_QUOTE_EXPIRED: "BULK_QUOTE_EXPIRED",
    REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH: "REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH",
    REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED: "REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED",
    REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE: "REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE",
    REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH: "REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED: "REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE: "REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE",
    INDIVIDUAL_QUOTES_NOT_FOUND: "INDIVIDUAL_QUOTES_NOT_FOUND"
  };