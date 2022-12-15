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

import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start, stop } from "../../src/service";
import { MemoryMessageConsumer, MemoryMessageProducer, MemoryParticipantService, MemoryQuoteRepo, MemoryAccountLookupService, MemoryBulkQuoteRepo } from "@mojaloop/quoting-shared-mocks";
import { IBulkQuoteRepo, IParticipantService, IQuoteRepo, QuotingAggregate } from "@mojaloop/quoting-bc-domain";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantService = new MemoryParticipantService(logger);

const mockedQuoteRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

const mockedBulkQuoteRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const mockedAccountLookupService = new MemoryAccountLookupService(logger);

const mockedAggregate: QuotingAggregate = new QuotingAggregate(
    logger,
    mockedQuoteRepository,
    mockedBulkQuoteRepository,
    mockedProducer,
    mockedParticipantService,
    mockedAccountLookupService
);

describe("Quoting Service", () => {
    
    afterEach(async () => {
        jest.restoreAllMocks()
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("should be able to run start and init all variables", async()=>{
        // Arrange
        const spyConsumerSetTopics = jest.spyOn(mockedConsumer, "setTopics");
        const spyConsumerConnect = jest.spyOn(mockedConsumer, "connect");
        const spyConsumerStart = jest.spyOn(mockedConsumer, "connect");
        const spyConsumerCallback = jest.spyOn(mockedConsumer, "setCallbackFn");
        const spyProducerInit = jest.spyOn(mockedProducer, "connect");
        const spyQuoteRegistryInit = jest.spyOn(mockedQuoteRepository, "init");
     
        // Act
        await start(logger,mockedConsumer, mockedProducer,mockedQuoteRepository, mockedBulkQuoteRepository, mockedParticipantService,mockedAccountLookupService, mockedAggregate);

        // Assert
        expect(spyConsumerSetTopics).toBeCalledTimes(1); 
        expect(spyConsumerConnect).toBeCalledTimes(1);
        expect(spyConsumerStart).toBeCalledTimes(1);
        expect(spyConsumerCallback).toBeCalledTimes(1); 
        expect(spyProducerInit).toBeCalledTimes(1);
        expect(spyQuoteRegistryInit).toBeCalledTimes(1);
        
    });

    test("should teardown instances when server stopped", async()=>{
        // Arrange
        const spyConsumerDestroy = jest.spyOn(mockedConsumer, "destroy");
        const spyProducerDestroy = jest.spyOn(mockedProducer, "destroy");
        const spyQuoteRegistryDestroy = jest.spyOn(mockedQuoteRepository, "destroy");
        await start(logger,mockedConsumer, mockedProducer,mockedQuoteRepository, mockedBulkQuoteRepository, mockedParticipantService,mockedAccountLookupService, mockedAggregate);

        // Act
        await stop();
        
        // Assert
        expect(spyConsumerDestroy).toBeCalledTimes(1);
        expect(spyProducerDestroy).toBeCalledTimes(1);
        expect(spyQuoteRegistryDestroy).toBeCalledTimes(1);
    });

    
});