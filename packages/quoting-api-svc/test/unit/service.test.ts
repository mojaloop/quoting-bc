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

import { IQuoteRepo, IBulkQuoteRepo} from "@mojaloop/quoting-bc-domain-lib";
import { MemoryQuoteRepo, MemoryAuditService, MemoryConfigProvider, MemoryBulkQuoteRepo } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { IConfigProvider } from "@mojaloop/platform-configuration-bc-client-lib";
import { Service } from "../../src/service";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { LocalAuditClientCryptoProvider } from "@mojaloop/auditing-bc-client-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);


const mockedAuditService = new MemoryAuditService(logger);

const mockedQuotesRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

const mockedBulkQuotesRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const mockedConfigProvider: IConfigProvider = new MemoryConfigProvider(logger);

const metricsMock: IMetrics = new MetricsMock();

const expressListenSpy = jest.fn();

const expressAppMock = {
    listen: expressListenSpy,
    use: jest.fn(),
    get: jest.fn()
}
jest.doMock('express', () => {
    return () => {
      return expressAppMock
    }
})

jest.mock('mongodb', () => ({
    ...jest.requireActual('mongodb'),
    insertOne: () => { 
        debugger
        throw Error(); 
    }
}));

const configurationClientInitSpy = jest.fn();
const configurationClientBootstrapSpy = jest.fn();
const configurationClientFetchSpy = jest.fn();
const configurationClientDestroySpy = jest.fn();

jest.mock('@mojaloop/platform-configuration-bc-client-lib', () => {
    const mockGlobalConfigs = {
        getCurrencies: jest.fn(() => ['USD', 'EUR', 'GBP']) // Mocking the getCurrencies method
    };

    return {
        DefaultConfigProvider: jest.fn().mockImplementation(() => ({
        })),
        ConfigurationClient: jest.fn().mockImplementation(() => ({
            init: configurationClientInitSpy, 
            bootstrap: configurationClientBootstrapSpy, 
            fetch: configurationClientFetchSpy,
            destroy: configurationClientDestroySpy, 
            globalConfigs: mockGlobalConfigs
        }))
    };
});


jest.mock('@mojaloop/security-bc-client-lib');
jest.mock('@mojaloop/auditing-bc-client-lib');

jest.setTimeout(15000);

describe('API Service - Unit Tests for QuotingBC API Service', () => {

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("should be able to run start and init all variables", async()=>{
        // Arrange & Act
        await Service.start(logger, mockedAuditService, mockedQuotesRepository, mockedBulkQuotesRepository, mockedConfigProvider, metricsMock);

        // Assert
        expect(configurationClientInitSpy).toHaveBeenCalledTimes(1);
        expect(configurationClientBootstrapSpy).toHaveBeenCalledTimes(1);
        expect(configurationClientFetchSpy).toHaveBeenCalledTimes(1);

        // Cleanup
        await Service.stop();

    });

    test("should teardown instances when server stopped", async()=>{
        // Arrange & Act
        await Service.start(logger, mockedAuditService, mockedQuotesRepository, mockedBulkQuotesRepository, mockedConfigProvider, metricsMock);

        await Service.stop();

        // Assert
        expect(configurationClientDestroySpy).toHaveBeenCalledTimes(1);

    });

    // test("should create instance on runtime and also teardown all of them", async()=>{
    //     // Arrange
    //     const loggerConstructorInitSpy = jest.spyOn(KafkaLogger.prototype, 'init');
    //     const loggerConstructorDestroySpy = jest.spyOn(KafkaLogger.prototype, 'destroy');

    //     const auditClientConstructorInitSpy = jest.spyOn(LocalAuditClientCryptoProvider, 'createRsaPrivateKeyFileSync');

    //     // Act
    //     await Service.start();

    //     // Assert Init
    //     expect(loggerConstructorInitSpy).toHaveBeenCalledTimes(1);
    //     expect(auditClientConstructorInitSpy).toHaveBeenCalledTimes(1);

    //     // Cleanup
    //     await Service.stop();

    //     // Assert Cleanup
    //     expect(loggerConstructorDestroySpy).toHaveBeenCalledTimes(1);

    // });
});

