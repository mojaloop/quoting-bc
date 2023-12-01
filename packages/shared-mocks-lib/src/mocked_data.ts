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

import { IBulkQuote, IQuote, QuoteStatus } from "@mojaloop/quoting-bc-domain-lib";

const now = Date.now();

export const mockedQuote1 : IQuote = {
    createdAt: now,
    updatedAt: now,
    requesterFspId: "1",
    destinationFspId: "10",
    quoteId: "1",
    bulkQuoteId: null,
    transactionId: "2",
    transactionRequestId: "11",
    payee: {
		partyIdInfo: {
			partyIdType: "partyType1",
			partyIdentifier: "111",
			fspId: "1",
			partySubIdOrType: "partySubIdOrType1"
		},
		name: "River Turcotte",
		personalInfo: {
			dateOfBirth: "1980-01-01",
			complexName: {
			firstName: "River",
			middleName: "Turcotte",
			lastName: "River Turcotte"
		}
		},
		merchantClassificationCode: "123"
    },
    payer: {
		partyIdInfo: {
			partyIdType: "partyType2",
			partyIdentifier: "222",
			partySubIdOrType: "partySubIdOrType2",
			fspId: "2"
		},
		name: "Luther Blanda",
		personalInfo: {
			dateOfBirth: "2000-01-01",
			complexName: {
			firstName: "Luther",
			middleName: "Blanda",
			lastName: "Luther Blanda"
			}
		},
		merchantClassificationCode: "133"
    },
    amountType: "SEND",
    amount: {
      currency: "EUR",
      amount: "200"
    },
    transactionType: {
		balanceOfPayments: "debit",
		scenario: "qui laudantium consequatur",
		subScenario: "doloremque magnam aliquid",
		initiator: "Velit et fuga ipsam iure iusto voluptatem voluptate.",
		initiatorType: "earum",
		refundInfo: {
			refundReason: "Refund Reason",
			originalTransactionId: "Dolores porro et ut quos exercitationem ut eaque dolorum sint.\nQuisquam nihil deserunt iure et ducimus officia aut ea.\nA molestiae minus facere recusandae."
		}
    },
    feesPayer: {
		currency: "EUR",
		amount: "5"
    },
    expiration: "2018-08-15T08:43:25.699Z",
    extensionList: {
		extension: [
			{
			key: "key",
			value: "value"
			}
		]
    },
    status: QuoteStatus.ACCEPTED,
    ilpPacket: "omnis",
    payeeReceiveAmount: {
		currency: "EUR",
		amount: "200"
    },
    payeeFspFee: {
		currency: "EUR",
		amount: "2"
    },
    payeeFspCommission: {
		currency: "EUR",
		amount: "2.5"
    },
    condition: "omnis",
    geoCode: {
		latitude: "1",
		longitude: "2"
    },
    note: "note",
    totalTransferAmount: {
		currency: "EUR",
		amount: "200"
    },
    errorInformation: {
		errorCode: "8562",
		errorDescription: "aliquip",
		extensionList: {
			extension: [
				{
					key: "ad aliqua dolor reprehende",
					value: "ipsum aliq"
				},
				{
					key: "la",
					value: "commodo dolore et"
				}
			]
		}
    }
    ,
    transferAmount: null
};

export const mockedQuote2 : IQuote = {
	createdAt: now,
	updatedAt: now,
	requesterFspId: "2",
	destinationFspId: "11",
	quoteId: "2",
	bulkQuoteId: null,
	transactionId: "3",
	transactionRequestId: "12",
	payee: {
		partyIdInfo: {
			partyIdType: "partyType11",
			partyIdentifier: "11",
			fspId: "11",
			partySubIdOrType: "partySubIdOrType11"
		},
		name: "John Doe",
		personalInfo: {
			dateOfBirth: "1980-01-01",
			complexName: {
				firstName: "John",
				middleName: "Doe",
				lastName: "John Doe"
			}
		},
		merchantClassificationCode: "13",
	},
	payer: {
		partyIdInfo: {
			partyIdType: "partyType22",
			partyIdentifier: "222",
			partySubIdOrType: "partySubIdOrType2",
			fspId: "22"
		},
		name: "Luther Singh",
		personalInfo: {
			dateOfBirth: "2000-01-01",
			complexName: {
				firstName: "Luther",
				middleName: "Singh",
				lastName: "Luther Singh"
			}
		},
		merchantClassificationCode: "14"
	},
	amountType: "SEND",
	amount: {
		currency: "USD",
		amount: "300"
	},
	transactionType: {
		balanceOfPayments: "debit",
		scenario: "qui laudantium consequatur",
		subScenario: "doloremque magnam aliquid",
		initiator: "Velit et fuga ipsam iure iusto voluptatem voluptate.",
		initiatorType: "earum",
		refundInfo: {
			refundReason: "Refund Reason",
			originalTransactionId: "Dolores porro et ut quos exercitationem ut eaque dolorum sint.\nQuisquam nihil deserunt iure et ducimus officia aut ea.\nA molestiae minus facere recusandae."
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	status: QuoteStatus.PENDING,
	ilpPacket: "omnis",
	payeeReceiveAmount: {
		currency: "USD",
		amount: "300"
	},
	payeeFspFee: {
		currency: "USD",
		amount: "2.2"
	},
	payeeFspCommission: {
		currency: "USD",
		amount: "2"
	},
	feesPayer: {
		currency: "USD",
		amount: "2"
	},
	condition: "omnis",
	geoCode: {
		latitude: "11",
		longitude: "22"
	},
	note: "note",
	totalTransferAmount: {
		currency: "USD",
		amount: "304.2"
	},
	errorInformation: {
		errorCode: "8562",
		errorDescription: "aliquip",
		extensionList: {
		extension: [
			{
				key: "ad aliqua dolor reprehende",
				value: "ipsum aliq"
			},
			{
				key: "la",
				value: "commodo dolore et"
			}
		]
		}
	},
	transferAmount: null
};

export const mockedQuote3 : IQuote = {
	createdAt: now,
	updatedAt: now,
	requesterFspId: "3",
	destinationFspId: "12",
	quoteId: "3",
	bulkQuoteId: null,
	transactionId: "3",
	transactionRequestId: "13",
	payee: {
		partyIdInfo: {
			partyIdType: "partyType12",
			partyIdentifier: "12",
			fspId: "12",
			partySubIdOrType: "partySubIdOrType12"
		},
		name: "John Second",
		personalInfo: {
			dateOfBirth: "1980-01-01",
			complexName: {
				firstName: "John",
				middleName: "Second",
				lastName: "John Second"
			}
		},
		merchantClassificationCode: "14"
	},
	payer: {
		partyIdInfo: {
			partyIdType: "partyType23",
			partyIdentifier: "23",
			partySubIdOrType: "partySubIdOrType23",
			fspId: "23"
		},
		name: "Raymond Blanda",
		personalInfo: {
			dateOfBirth: "2000-01-01",
			complexName: {
				firstName: "Raymond",
				middleName: "Blanda",
				lastName: "Raymond Blanda"
			}
		},
		merchantClassificationCode: "15"
	},
	amountType: "RECEIVE",
	amount: {
		currency: "USD",
		amount: "400"
	},
	transactionType: {
		balanceOfPayments: "debit",
		scenario: "qui laudantium consequatur",
		subScenario: "doloremque magnam aliquid",
		initiator: "Velit et fuga ipsam iure iusto voluptatem voluptate.",
		initiatorType: "earum",
		refundInfo: {
			refundReason: "Refund Reason",
			originalTransactionId: "Dolores porro et ut quos exercitationem ut eaque dolorum sint.\nQuisquam nihil deserunt iure et ducimus offic",
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	status: QuoteStatus.REJECTED,
	ilpPacket: "omnis",
	payeeReceiveAmount: {
		currency: "USD",
		amount: "400"
	},
	payeeFspFee: {
		currency: "USD",
		amount: "2.2"
	},
	payeeFspCommission: {
		currency: "USD",
		amount: "2"
	},
	feesPayer: {
		currency: "USD",
		amount: "2"
	},
	condition: "omnis",
	geoCode: {
		latitude: "11",
		longitude: "22"
	},
	note: "note",
	totalTransferAmount: {
		currency: "USD",
		amount: "404.2"
	},
	errorInformation: {
		errorCode: "8562",
		errorDescription: "aliquip",
		extensionList: {
			extension: [
				{
					key: "ad aliqua dolor reprehende",
					value: "ipsum aliq"
				},
				{
					key: "la",
					value: "commodo dolore et"
				}
			]
		}
	},
	transferAmount: null
};

export const mockedQuote4 : IQuote = {
	createdAt: now,
	updatedAt: now,
	requesterFspId: "4",
	destinationFspId: "13",
	quoteId: "4",
	bulkQuoteId: null,
	transactionId: "4",
	transactionRequestId: "14",
	payee: {
		partyIdInfo: {
			partyIdType: "partyType13",
			partyIdentifier: "13",
			fspId: "13",
			partySubIdOrType: "partySubIdOrType13"
		},
		name: "John Third",
		personalInfo: {
			dateOfBirth: "1980-01-01",
			complexName: {
				firstName: "John",
				middleName: "Third",
				lastName: "John Third"
			}
		},
		merchantClassificationCode: "14"
	},
	payer: {
		partyIdInfo: {
			partyIdType: "partyType24",
			partyIdentifier: "24",
			partySubIdOrType: "partySubIdOrType24",
			fspId: "24"
		},
		name: "Marvin Rolfson",
		personalInfo: {
			dateOfBirth: "2000-01-01",
			complexName: {
				firstName: "Marvin",
				middleName: "Rolfson",
				lastName: "Marvin Rolfson"
			}
		},
		merchantClassificationCode: "15"
	},
	amountType: "RECEIVE",
	amount: {
		currency: "EUR",
		amount: "1000"
	},
	transactionType: {
		balanceOfPayments: "debit",
		scenario: "qui laudantium consequatur",
		subScenario: "doloremque magnam aliquid",
		initiator: "Velit et fuga ipsam iure iusto voluptatem voluptate.",
		initiatorType: "earum",
		refundInfo: {
			refundReason: "Refund Reason",
			originalTransactionId: "Dolores porro et ut quos exercitationem ut eaque dolorum sint.\nQuisquam nihil deserunt iure et ducimus offic",
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	status: QuoteStatus.ACCEPTED,
	ilpPacket: "omnis",
	payeeReceiveAmount: {
		currency: "EUR",
		amount: "1000"
	},
	payeeFspFee: {
		currency: "EUR",
		amount: "4.2"
	},
	payeeFspCommission: {
		currency: "EUR",
		amount: "5"
	},
	feesPayer: {
		currency: "EUR",
		amount: "5"
	},
	condition: "omnis",
	geoCode: {
		latitude: "113",
		longitude: "224"
	},
	note: "note",
	totalTransferAmount: {
		currency: "EUR",
		amount: "1010.2"
	},
	errorInformation: {
		errorCode: "8562",
		errorDescription: "aliquip",
		extensionList: {
			extension: [
				{
					key: "ad aliqua dolor reprehende",
					value: "ipsum aliq"
				},
				{
					key: "la",
					value: "commodo dolore et"
				}
			]
		}
	},
	transferAmount: {
		currency: "EUR",
		amount: "1010.2"
	}
};

export const mockedQuotes : IQuote[] = [
	mockedQuote1,
	mockedQuote2,
	mockedQuote3,
	mockedQuote4
];

export const mockedBulkQuote1 : IBulkQuote = {
	createdAt: now,
    updatedAt: now,
	bulkQuoteId: "1",
	payer: {
		merchantClassificationCode: "1",
		name: "John Doe",
		personalInfo: {
			complexName: {
				firstName: "John",
				middleName: "Doe",
				lastName: "John Doe"
			},
			dateOfBirth: "1980-01-01"
		},
		partyIdInfo: {
			partyIdType: "partyType1",
			partyIdentifier: "111",
			partySubIdOrType: "partySubIdOrType1"
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	individualQuotes: [
		{
			"quoteId": "2243fdbe-5dea-3abd-a210-3780e7f2f1f4",
			"transactionId": "7f5d9784-3a57-5865-9aa0-7dde7791548a",
			"payee": {
				"partyIdInfo": {
					"partyIdType": "MSISDN",
					"partyIdentifier": "1"
				}
			},
			"amountType": "SEND",
			"amount": {
				"currency": "EUR",
				"amount": "1"
			},
			"transactionType": {
				"scenario": "DEPOSIT",
				"initiator": "PAYER",
				"initiatorType": "BUSINESS"
			}
		},
		{
			"quoteId": "1243fdbe-5dea-3abd-a210-3780e7f2f1f4",
			"transactionId": "7f5d9784-3a57-5865-9aa0-7dde7791548a",
			"payee": {
				"partyIdInfo": {
					"partyIdType": "MSISDN",
					"partyIdentifier": "1"
				}
			},
			"amountType": "SEND",
			"amount": {
				"currency": "EUR",
				"amount": "1"
			},
			"transactionType": {
				"scenario": "DEPOSIT",
				"initiator": "PAYER",
				"initiatorType": "BUSINESS"
			}
		}
	],
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	geoCode: {
		latitude: "1",
		longitude: "2"
	},
	status: QuoteStatus.RECEIVED,
	quotesNotProcessedIds: ["3", "4"]
} as unknown as IBulkQuote;

export const mockedBulkQuote2 : IBulkQuote = {
	createdAt: now,
    updatedAt: now,
	bulkQuoteId: "2",
	payer: {
		merchantClassificationCode: "2",
		name: "John Smith",
		personalInfo: {
			complexName: {
				firstName: "John",
				middleName: "Smith",
				lastName: "John Smith"
			},
			dateOfBirth: "1980-01-01"
		},
		partyIdInfo: {
			fspId: "2",
			partyIdentifier: "2",
			partyIdType: "partyType2",
			partySubIdOrType: "partySubIdOrType2"
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	individualQuotes: [mockedQuote1, mockedQuote2, mockedQuote3, mockedQuote4],
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	geoCode: {
		latitude: "1",
		longitude: "2"
	},
	status: QuoteStatus.RECEIVED,
	quotesNotProcessedIds: ["1", "2"],
};

export const mockedBulkQuote3 : IBulkQuote = {
	createdAt: now,
    updatedAt: now,
	bulkQuoteId: "3",
	payer: {
		merchantClassificationCode: "3",
		name: "John Third",
		personalInfo: {
			complexName: {
				firstName: "John",
				middleName: "Third",
				lastName: "John Third"
			},
			dateOfBirth: "1980-01-01"
		},
		partyIdInfo: {
			fspId: "3",
			partyIdentifier: "3",
			partyIdType: "partyType3",
			partySubIdOrType: "partySubIdOrType3"
		}
	},
	expiration: "2018-08-15T08:43:25.699Z",
	individualQuotes: [ mockedQuote1, mockedQuote2, mockedQuote3 ],
	extensionList: {
		extension: [
			{
				key: "key",
				value: "value"
			}
		]
	},
	geoCode: {
		latitude: "1",
		longitude: "2"
	},
	status: QuoteStatus.REJECTED,
	quotesNotProcessedIds: ["3"]
};







