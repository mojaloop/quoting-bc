/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
**/

import { mockedQuoteRequestPayload, mockedQuoteResponsePayload, mockedQuoteQueryPayload, quoteRejectedPayload, bulkQuoteRequestedPayload, bulkQuotePendingPayload, mockedBulkQuoteQueryPayload, bulkQuoteRejectedPayload, MemoryTracing } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { QuotingEventHandler } from "../../src/handler";
import { IMetrics, ITracing, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { BulkQuotePendingReceivedEvt, BulkQuoteQueryReceivedEvt, BulkQuoteRejectedEvt, BulkQuoteRequestedEvt, QuoteQueryReceivedEvt, QuoteRejectedEvt, QuoteRequestReceivedEvt, QuoteResponseReceivedEvt, QuotingBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { QueryReceivedBulkQuoteCmd, QueryReceivedQuoteCmd, RejectedBulkQuoteCmd, RejectedQuoteCmd, RequestReceivedBulkQuoteCmd, RequestReceivedQuoteCmd, ResponseReceivedBulkQuoteCmd, ResponseReceivedQuoteCmd } from "../../../domain-lib/src/commands";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const messageConsumerMock = {
    setTopics: jest.fn(),
    setBatchCallbackFn: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    startAndWaitForRebalance: jest.fn().mockResolvedValue(undefined),
};
const messageProducerMock = {
    connect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
};
const metricsMock: IMetrics = new MetricsMock();

jest.mock("@mojaloop/platform-shared-lib-observability-client-lib", () => {
    const originalModule = jest.requireActual("@mojaloop/platform-shared-lib-observability-client-lib");

    return {
        ...originalModule,
        OpenTelemetryClient: {
            getInstance: jest.fn(() => ({
                trace: {
                    getTracer: jest.fn(() => ({
                        startActiveSpan: jest.fn((spanName, spanOptions, context, callback) => {
                            const mockSpan = {
                              end: jest.fn(),
                            };
                            return callback(mockSpan);
                    })})),
                },
                startSpanWithPropagationInput: jest.fn((tracer, spanName, input) => {
                    return {
                        setAttributes: jest.fn((tracer, spanName, input) => {
                        }),
                        setStatus: jest.fn(() => {
                            return {
                                end: jest.fn()
                            }
                        }),
                        setAttribute: jest.fn(),
                        updateName: jest.fn(),
                        end: jest.fn()
                    }
                }),
                startChildSpan: jest.fn(() => {
                    return {
                        setAttribute: jest.fn(),
                        end: jest.fn()
                    }
                }),
                startSpan: jest.fn(() => {
                    return {
                        setAttribute: jest.fn(),
                        end: jest.fn()
                    }
                }),
                propagationInject: jest.fn(),
                propagationExtract: jest.fn()
            })),
        },
        PrometheusMetrics: {
            Setup: jest.fn(() => ({

            })),
        },
        OpentelemetryApi: {
            propagation: {
                getBaggage: jest.fn(() => ({
                    getEntry: (startTimeStamp:number) => {
                        return {
                            value: Date.now()
                        };
                    }
                })),
            }
        },
    };
});

jest.mock("@opentelemetry/api", () => {
    const originalModule = jest.requireActual("@opentelemetry/api");

    return {
        ...originalModule,
        propagation: {
            getBaggage: jest.fn(() => ({
                getEntry: jest.fn()
            })),
        }
    };
});

describe('Event Handler - Unit Tests for QuotingBC Event Handler', () => {
    let quotingEventHandler:any;

    beforeEach(() => {
        quotingEventHandler = new QuotingEventHandler(logger, messageConsumerMock as any, messageProducerMock as any, metricsMock);
    });

    it('should connect message producer and start message consumer', async () => {
        messageProducerMock.connect.mockResolvedValue(undefined);
        messageConsumerMock.setTopics.mockImplementation(() => {});
        messageConsumerMock.setBatchCallbackFn.mockImplementation(() => {});
        messageConsumerMock.connect.mockResolvedValue(undefined);
        messageConsumerMock.startAndWaitForRebalance.mockResolvedValue(undefined);

        await quotingEventHandler.start();

        expect(messageProducerMock.connect).toHaveBeenCalled();
        expect(messageConsumerMock.setTopics).toHaveBeenCalledWith([QuotingBCTopics.DomainRequests]);
        expect(messageConsumerMock.setBatchCallbackFn).toHaveBeenCalled();
        expect(messageConsumerMock.connect).toHaveBeenCalled();
        expect(messageConsumerMock.startAndWaitForRebalance).toHaveBeenCalled();
    });

    it('should process QuoteRequestReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            bulkQuoteId: null,
            ...mockedQuoteRequestPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: QuoteRequestReceivedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RequestReceivedQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process QuoteResponseReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...mockedQuoteResponsePayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: QuoteResponseReceivedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: ResponseReceivedQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process QuoteQueryReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...mockedQuoteQueryPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: QuoteQueryReceivedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: QueryReceivedQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process QuoteRejectedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...quoteRejectedPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: QuoteRejectedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RejectedQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process BulkQuoteRequestedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...bulkQuoteRequestedPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: BulkQuoteRequestedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RequestReceivedBulkQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process BulkQuotePendingReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...bulkQuotePendingPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: BulkQuotePendingReceivedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: ResponseReceivedBulkQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });

    it('should process BulkQuoteQueryReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...mockedBulkQuoteQueryPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: BulkQuoteQueryReceivedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: QueryReceivedBulkQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });


    it('should process BulkQuoteRejectedEvt successfully', async () => {
        // Arrange
        const payload = {
            ...bulkQuoteRejectedPayload,
        }

        const inboundProtocolOpaqueState = {
            committedSendTimestamp: 123456789,
            prepareSendTimestamp: 123456789
        };

        const receivedMessages = [
            {
                msgType: MessageTypes.DOMAIN_EVENT,
                msgName: BulkQuoteRejectedEvt.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RejectedBulkQuoteCmd.name,
                payload: payload,
                inboundProtocolType: "FSPIOP_v1_1",
                inboundProtocolOpaqueState: inboundProtocolOpaqueState
            })
        ]);
    });
});
