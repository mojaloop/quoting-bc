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

import { MemoryAuditService, mockedQuoteRequestPayload, mockedQuoteResponsePayload, mockedQuoteQueryPayload, quoteRejectedPayload, bulkQuoteRequestedPayload, bulkQuotePendingPayload, mockedBulkQuoteQueryPayload, bulkQuoteRejectedPayload } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { QuotingEventHandler } from "../../src/handler";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { BulkQuotePendingReceivedEvt, BulkQuoteQueryReceivedEvt, BulkQuoteRejectedEvt, BulkQuoteRequestedEvt, QuoteQueryReceivedEvt, QuoteRejectedEvt, QuoteRequestReceivedEvt, QuoteResponseReceivedEvt, QuotingBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { QueryReceivedBulkQuoteCmd, QueryReceivedQuoteCmd, RejectedBulkQuoteCmd, RejectedQuoteCmd, RequestReceivedBulkQuoteCmd, RequestReceivedQuoteCmd, ResponseReceivedBulkQuoteCmd, ResponseReceivedQuoteCmd } from "../../../domain-lib/src/commands";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedAuditService = new MemoryAuditService(logger);

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


describe('Event Handler - Unit Tests for QuotingBC Event Handler', () => {
    let quotingEventHandler:any;

    beforeEach(() => {
        quotingEventHandler = new QuotingEventHandler(logger, mockedAuditService, messageConsumerMock as any, messageProducerMock as any, metricsMock);
    });

    it('should connect message producer and start message consumer', async () => {
        messageProducerMock.connect.mockResolvedValue(undefined);
        messageConsumerMock.setTopics.mockImplementation(() => {});
        messageConsumerMock.setBatchCallbackFn.mockImplementation(() => {});
        messageConsumerMock.connect.mockResolvedValue(undefined);
        messageConsumerMock.startAndWaitForRebalance.mockResolvedValue(undefined);

        await quotingEventHandler.start();

        expect(messageProducerMock.connect).toHaveBeenCalled();
        expect(messageConsumerMock.setTopics).toHaveBeenCalledWith([QuotingBCTopics.DomainRequests, QuotingBCTopics.DomainEvents]);
        expect(messageConsumerMock.setBatchCallbackFn).toHaveBeenCalled();
        expect(messageConsumerMock.connect).toHaveBeenCalled();
        expect(messageConsumerMock.startAndWaitForRebalance).toHaveBeenCalled();
    });
 
    it('should process QuoteRequestReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            bulkQuoteId: null,
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...mockedQuoteRequestPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: QuoteRequestReceivedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RequestReceivedQuoteCmd.name,
                payload: payload
            })
        ]);
    });

    it('should process QuoteResponseReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...mockedQuoteResponsePayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: QuoteResponseReceivedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: ResponseReceivedQuoteCmd.name,
                payload: payload
            })
        ]);
    });

    it('should process QuoteQueryReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...mockedQuoteQueryPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: QuoteQueryReceivedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: QueryReceivedQuoteCmd.name,
                payload: payload
            })
        ]);
    });

    it('should process QuoteRejectedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...quoteRejectedPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: QuoteRejectedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RejectedQuoteCmd.name,
                payload: payload
            })
        ]);
    });
    
    it('should process BulkQuoteRequestedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...bulkQuoteRequestedPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: BulkQuoteRequestedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RequestReceivedBulkQuoteCmd.name,
                payload: payload
            })
        ]);
    });
    
    it('should process BulkQuotePendingReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...bulkQuotePendingPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: BulkQuotePendingReceivedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: ResponseReceivedBulkQuoteCmd.name,
                payload: payload
            })
        ]);
    });

    it('should process BulkQuoteQueryReceivedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...mockedBulkQuoteQueryPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: BulkQuoteQueryReceivedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: QueryReceivedBulkQuoteCmd.name,
                payload: payload
            })
        ]);
    });

    
    it('should process BulkQuoteRejectedEvt successfully', async () => {
        // Arrange
        const payload = {
            prepare: { committedSendTimestamp: 123456789, prepareSendTimestamp: 123456789 },
            ...bulkQuoteRejectedPayload,
        }

        const receivedMessages = [
            { msgType: MessageTypes.DOMAIN_EVENT, msgName: BulkQuoteRejectedEvt.name, payload: payload, fspiopOpaqueState: payload.prepare },
        ];

        jest.spyOn(messageProducerMock, "send");

        // Act
        await quotingEventHandler._batchMsgHandler(receivedMessages);

        // Assert
        expect(messageProducerMock.send).toHaveBeenCalledWith([
            expect.objectContaining({
                msgName: RejectedBulkQuoteCmd.name,
                payload: payload
            })
        ]);
    });
});