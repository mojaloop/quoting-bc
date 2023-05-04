import {QuotingBCInvalidMessagePayloadErrorPayload, QuotingBCInvalidMessagePayloadErrorEvent } from "@mojaloop/platform-shared-lib-public-messages-lib";


export function createInvalidMessagePayloadErrorEvent(errorDescription:string, fspId:string, quoteId: string, bulkQuoteId:string ) {
}

export function createInvalidMessageTypeErrorEvent(errorDescription:string, fspId:string, quoteId: string, bulkQuoteId:string){

}

export function createBulkQuoteNotFoundErrorEvent(errorDescription:string, fspId:string, bulkQuoteId:string){

}

export function createQuoteNotFoundErrorEvent(errorDescription:string, fspId:string, quoteId:string){

}

export function createQuoteDuplicateErrorEvent(errorDescription:string, fspId:string, quoteId:string){

}

export function createParticipantNotFoundErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string){

}

export function createInvalidParticipantErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string){

}

export function createInvalidRequesterFspIdErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string){

}

export function createInvalidDestinationFspIdErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string){

}


export function createUnknownErrorEvent(errorDescription:string, fspId:string, quoteId:string, bulkQuoteId:string){

}

