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

import { QuotingAggregate, IParticipantService, IQuoteRepo, IBulkQuoteRepo, IAccountLookupService} from "@mojaloop/quoting-bc-domain-lib";
import { MemoryMessageProducer, MemoryMessageConsumer, MemoryParticipantService, MemoryQuoteRepo, MemoryAuditService, MemoryConfigProvider, MemoryBulkQuoteRepo, MemoryAccountLookupService, MemoryTracing } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IMetrics, ITracing, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { IConfigProvider } from "@mojaloop/platform-configuration-bc-client-lib";
import { Service } from "../../src/service";
import { currencyList } from "@mojaloop/quoting-bc-domain-lib/test/utils/mocked_variables";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { LocalAuditClientCryptoProvider } from "@mojaloop/auditing-bc-client-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedMessageProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedMessageConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedAccountLookupService:IAccountLookupService = new MemoryAccountLookupService(logger);

const mockedAuditService = new MemoryAuditService(logger);

const mockedQuotesRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

const mockedBulkQuotesRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const mockedConfigProvider: IConfigProvider = new MemoryConfigProvider(logger);

const metricsMock: IMetrics = new MetricsMock();
const tracingMock: ITracing = new MemoryTracing();

const PASS_THROUGH_MODE = true;


const mockedAggregate: QuotingAggregate = new QuotingAggregate(
    logger,
    mockedQuotesRepository,
    mockedBulkQuotesRepository,
    mockedMessageProducer,
    mockedParticipantService,
    mockedAccountLookupService,
    metricsMock,
    PASS_THROUGH_MODE,
    currencyList,
    tracingMock
);



jest.mock('@mojaloop/platform-configuration-bc-client-lib', () => {
    const mockGlobalConfigs = {
        getCurrencies: jest.fn(() => ['USD', 'EUR', 'GBP'])
    };
    
    return {
        DefaultConfigProvider: jest.fn().mockImplementation(() => ({
        })),
        ConfigurationClient: jest.fn().mockImplementation(() => ({
            init: jest.fn().mockResolvedValue(true), 
            bootstrap: jest.fn().mockResolvedValue(true), 
            fetch: jest.fn().mockResolvedValue(true),
            destroy: jest.fn().mockResolvedValue(true),
            globalConfigs: mockGlobalConfigs
        }))
    };
});

jest.mock('@mojaloop/auditing-bc-client-lib');
jest.mock('@mojaloop/platform-shared-lib-nodejs-kafka-client-lib');
jest.mock('@mojaloop/quoting-bc-implementations-lib');

jest.mock("@mojaloop/platform-shared-lib-observability-client-lib", () => {
    const originalModule = jest.requireActual("@mojaloop/platform-shared-lib-observability-client-lib");

    return {
        ...originalModule,
        OpenTelemetryClient: {
            Start: jest.fn(),
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
            getInstance: jest.fn(() => ({
                getHistogram: () => {
                    return {
                        value: Date.now()
                    };
                },
                getCounter: () => {
                    return {
                        value: Date.now()
                    };
                },
                getGauge: () => {
                    return {
                        value: Date.now()
                    };
                }
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


describe('Command Handler - Unit Tests for QuotingBC Command Handler Service', () => {

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("should be able to run start and init all variables", async()=>{
        // Arrange
        const spyConsumerSetTopics = jest.spyOn(mockedMessageConsumer, "setTopics");
        const spyConsumerConnect = jest.spyOn(mockedMessageConsumer, "connect");
        const spyConsumerStart = jest.spyOn(mockedMessageConsumer, "connect");
        const spyConsumerBackCallback = jest.spyOn(mockedMessageConsumer, "setBatchCallbackFn");


        // Act
        await Service.start(logger, mockedAuditService, mockedMessageConsumer, mockedMessageProducer, mockedParticipantService, mockedAccountLookupService, mockedQuotesRepository, mockedBulkQuotesRepository,
            metricsMock, mockedConfigProvider, mockedAggregate);

        // Assert
        expect(spyConsumerSetTopics).toHaveBeenCalledTimes(1);
        expect(spyConsumerConnect).toHaveBeenCalledTimes(1);
        expect(spyConsumerStart).toHaveBeenCalledTimes(1);
        expect(spyConsumerBackCallback).toHaveBeenCalledTimes(1);

        // Cleanup
        await Service.stop();

    });

    test("should teardown instances when server stopped", async()=>{
        // Arrange
        const spyMockedConsumer = jest.spyOn(mockedMessageConsumer, "destroy");
        const spyMockedProducer = jest.spyOn(mockedMessageProducer, "destroy");

        // Act
        await Service.start(logger, mockedAuditService, mockedMessageConsumer, mockedMessageProducer, mockedParticipantService, mockedAccountLookupService, mockedQuotesRepository, mockedBulkQuotesRepository,
            metricsMock, mockedConfigProvider, mockedAggregate);

        await Service.stop();

        // Assert
        expect(spyMockedConsumer).toHaveBeenCalledTimes(1);
        expect(spyMockedProducer).toHaveBeenCalledTimes(1);
    });

    test("should create instance on runtime and also teardown all of them", async()=>{
        // Arrange
        const loggerConstructorInitSpy = jest.spyOn(KafkaLogger.prototype, 'init');
        const loggerConstructorDestroySpy = jest.spyOn(KafkaLogger.prototype, 'destroy');

        // Act
        await Service.start();

        // Assert Init
        expect(loggerConstructorInitSpy).toHaveBeenCalledTimes(1);

        // Cleanup
        await Service.stop();

        // Assert Cleanup
        expect(loggerConstructorDestroySpy).toHaveBeenCalledTimes(1);

    });
});

