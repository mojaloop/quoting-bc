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

/* istanbul ignore file */

import {CommandMsg} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {QUOTING_BOUNDED_CONTEXT_NAME, QUOTING_AGGREGATE_NAME, QuotingBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";

export type RequestReceivedQuoteCmdPayload = {
	bulkQuoteId: string | null;
    quoteId: string;
    transactionId: string;
    transactionRequestId: string | null;
    payee: {
        partyIdInfo: {
            partyIdType: string;
            partyIdentifier: string;
            partySubIdOrType: string | null;
            fspId: string | null;
        };
        merchantClassificationCode: string | null;
        name: string | null;
        personalInfo: {
            complexName: {
                firstName: string | null;
                middleName: string | null;
                lastName: string | null;
            } | null;
            dateOfBirth: string | null;
            kycInformation: string | null;
        } | null;
        supportedCurrencies: string[] | null;
    };
    payer: {
        partyIdInfo: {
            partyIdType: string;
            partyIdentifier: string;
            partySubIdOrType: string | null;
            fspId: string | null;
        };
        merchantClassificationCode: string | null;
        name: string | null;
        personalInfo: {
            complexName: {
                firstName: string | null;
                middleName: string | null;
                lastName: string | null;
            } | null;
            dateOfBirth: string | null;
            kycInformation: string | null;
        } | null;
        supportedCurrencies: string[] | null;
    };
    amountType: "SEND" | "RECEIVE";
    amount: {
        currency: string;
        amount: string;
    };
    transactionType: {
        scenario: string;
        subScenario: string | null;
        initiator: string;
        initiatorType: string;
        refundInfo: {
            originalTransactionId: string;
            refundReason: string | null;
        } | null;
        balanceOfPayments: string | null;
    };
    converter: string | null;
    currencyConversion: {
        sourceAmount: {
            currency: string;
            amount: string;
        };
        targetAmount: {
            currency: string;
            amount: string;
        };
    } | null;
    fees: {
        currency: string;
        amount: string;
    } | null;
    geoCode: {
        latitude: string;
        longitude: string;
    } | null;
    note: string | null;
    expiration: string | null;
    extensionList: {
        extension: {
            key: string;
            value: string;
        }[];
    } | null;
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}

export class RequestReceivedQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: RequestReceivedQuoteCmdPayload;

	constructor(payload: RequestReceivedQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.quoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}

export type ResponseReceivedQuoteCmdPayload = {
    quoteId: string;
    transferAmount: {
        currency: string;
        amount: string;
    };
    expiration: string;
    ilpPacket: string;
    condition: string;
    payeeReceiveAmount: {
        currency: string;
        amount: string;
    } | null;
    payeeFspFee: {
        currency: string;
        amount: string;
    } | null;
    payeeFspCommission: {
        currency: string;
        amount: string;
    } | null;
    geoCode: {
        latitude: string;
        longitude: string;
    } | null;
    extensionList: {
        extension: {
            key: string;
            value: string;
        }[];
    } | null;
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}


export class ResponseReceivedQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: ResponseReceivedQuoteCmdPayload;

	constructor(payload: ResponseReceivedQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.quoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}

export type QueryReceivedQuoteCmdPayload = {
    quoteId: string;
    prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}

export class QueryReceivedQuoteCmd extends CommandMsg {
    boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
    aggregateId: string;
    aggregateName: string = QUOTING_AGGREGATE_NAME;
    msgKey: string;
    msgTopic: string = QuotingBCTopics.DomainRequests;

    payload: QueryReceivedQuoteCmdPayload;

    constructor (payload: QueryReceivedQuoteCmdPayload) {
        super();

        this.aggregateId = this.msgKey = payload.quoteId;
        this.payload = payload;
    }

    validatePayload (): void {
        const { quoteId } = this.payload;

        if (!quoteId) {
            throw new Error("quoteId is required.");
		}
    }
}

export type RejectedQuoteCmdPayload = {
    quoteId: string;
    errorInformation: {
        errorCode: string;
        errorDescription: string;
        extensionList: {
            extension: {
                key: string;
                value: string;
            }[];
        } | null;
    };
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}


export class RejectedQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: RejectedQuoteCmdPayload;

	constructor(payload: RejectedQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.quoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}

export type RequestReceivedBulkQuoteCmdPayload = {
    bulkQuoteId: string;
    payer: {
        partyIdInfo: {
            partyIdType: string;
            partyIdentifier: string;
            partySubIdOrType: string | null;
            fspId: string | null;
        };
        merchantClassificationCode: string | null;
        name: string | null;
        personalInfo: {
            complexName: {
                firstName: string | null;
                middleName: string | null;
                lastName: string | null;
            } | null;
            dateOfBirth: string | null;
            kycInformation: string | null;
        } | null;
        supportedCurrencies: string[] | null;
    };
    geoCode: {
        latitude: string;
        longitude: string;
    } | null;
    expiration: string | null;
    individualQuotes: {
        quoteId: string;
        transactionId: string;
        transactionRequestId: string | null;
        payee: {
            partyIdInfo: {
                partyIdType: string;
                partyIdentifier: string;
                partySubIdOrType: string | null;
                fspId: string | null;
            };
            merchantClassificationCode: string | null;
            name: string | null;
            personalInfo: {
                complexName: {
                    firstName: string | null;
                    middleName: string | null;
                    lastName: string | null;
                } | null;
                dateOfBirth: string | null;
                kycInformation: string | null;
            } | null;
            supportedCurrencies: string[] | null;
        };
        amountType: "SEND" | "RECEIVE";
        amount: {
            currency: string;
            amount: string;
        };
        fees: {
            currency: string;
            amount: string;
        } | null;
        transactionType: {
            scenario: string;
            subScenario: string | null;
            initiator: string;
            initiatorType: string;
            refundInfo: {
                originalTransactionId: string;
                refundReason: string | null;
            } | null;
            balanceOfPayments: string | null;
        };
        note: string | null;
        extensionList: {
            extension: {
                key: string;
                value: string;
            }[];
        } | null;
    }[];
    extensionList: {
        extension: {
            key: string;
            value: string;
        }[];
    } | null;
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}

export class RequestReceivedBulkQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: RequestReceivedBulkQuoteCmdPayload;

	constructor(payload: RequestReceivedBulkQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.bulkQuoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}

export type ResponseReceivedBulkQuoteCmdPayload = {
    bulkQuoteId: string;
    individualQuoteResults: {
        quoteId: string;
        payee: {
            partyIdInfo: {
                partyIdType: string;
                partyIdentifier: string;
                partySubIdOrType: string | null;
                fspId: string | null;
            };
            merchantClassificationCode: string | null;
            name: string | null;
            personalInfo: {
                complexName: {
                    firstName: string | null;
                    middleName: string | null;
                    lastName: string | null;
                } | null;
                dateOfBirth: string | null;
                kycInformation: string | null;
            } | null;
            supportedCurrencies: string[] | null;
        } | null;
        transferAmount: {
            currency: string;
            amount: string;
        } | null;
        payeeReceiveAmount: {
            currency: string;
            amount: string;
        } | null;
        payeeFspFee: {
            currency: string;
            amount: string;
        } | null;
        payeeFspCommission: {
            currency: string;
            amount: string;
        } | null;
        ilpPacket: string;
        condition: string;
        errorInformation: {
            errorCode: string;
            errorDescription: string;
            extensionList: {
                extension: {
                    key: string;
                    value: string;
                }[];
            };
        } | null;
        extensionList: {
            extension: {
                key: string;
                value: string;
            }[];
        } | null;
    }[];
    expiration: string | null;
    extensionList: {
        extension: {
            key: string;
            value: string;
        }[];
    } | null;
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}


export class ResponseReceivedBulkQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: ResponseReceivedBulkQuoteCmdPayload;

	constructor(payload: ResponseReceivedBulkQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.bulkQuoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}

export type QueryReceivedBulkQuoteCmdPayload = {
    bulkQuoteId: string;
    prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}

export class QueryReceivedBulkQuoteCmd extends CommandMsg {
    boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
    aggregateId: string;
    aggregateName: string = QUOTING_AGGREGATE_NAME;
    msgKey: string;
    msgTopic: string = QuotingBCTopics.DomainRequests;

    payload: QueryReceivedBulkQuoteCmdPayload;

    constructor (payload: QueryReceivedBulkQuoteCmdPayload) {
        super();

        this.aggregateId = this.msgKey = payload.bulkQuoteId;
        this.payload = payload;
    }

    validatePayload (): void {
        const { bulkQuoteId } = this.payload;

        if (!bulkQuoteId) {
            throw new Error("bulkQuoteId is required.");
		}
    }
}

export type RejectedBulkQuoteCmdPayload = {
    bulkQuoteId: string;
    errorInformation: {
        errorCode: string;
        errorDescription: string;
        extensionList: {
            extension: {
                key: string;
                value: string;
            }[];
        } | null;
    };
	prepare: {
		headers: { [key: string]: string };
		payload: string;
	};
}


export class RejectedBulkQuoteCmd extends CommandMsg {
	boundedContextName: string = QUOTING_BOUNDED_CONTEXT_NAME;
	aggregateId: string;
	aggregateName: string = QUOTING_AGGREGATE_NAME;
	msgKey: string;
	msgTopic: string = QuotingBCTopics.DomainRequests;
	payload: RejectedBulkQuoteCmdPayload;

	constructor(payload: RejectedBulkQuoteCmdPayload) {
		super();

		this.aggregateId = this.msgKey = payload.bulkQuoteId;
		this.payload = payload;
	}

	validatePayload(): void {
		// TODO
	}
}