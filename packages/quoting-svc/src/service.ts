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

import { QuotingAggregate, IQuoteRepo, IBulkQuoteRepo, IParticipantService, IAccountLookupService}  from "@mojaloop/quoting-bc-domain";
import { IMessage, IMessageProducer, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer, MLKafkaJsonConsumerOptions, MLKafkaJsonProducerOptions } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { QuotingBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { MongoQuotesRepo, MongoBulkQuotesRepo, ParticipantAdapter, AccountLookupAdapter } from "@mojaloop/quoting-bc-implementations";
import { QuotingAdminExpressRoutes } from "./routes/quote_admin_routes";
import express, {Express} from "express";
import {
	AuthenticatedHttpRequester,
	IAuthenticatedHttpRequester
} from "@mojaloop/security-bc-client-lib";

// Global vars
const BC_NAME = "quoting-bc";
const APP_NAME = "quoting-svc";
const APP_VERSION = "0.0.1";

// Logger
let logger: ILogger;
const DEFAULT_LOGLEVEL = LogLevel.DEBUG;

// Message Consumer/Publisher
const KAFKA_LOGS_TOPIC = process.env["QUOTING_KAFKA_LOG_TOPIC"] || "logs";
const KAFKA_URL = process.env["QUOTING_KAFKA_URL"] || "localhost:9092";

let messageConsumer: IMessageConsumer;
const consumerOptions: MLKafkaJsonConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

let messageProducer: IMessageProducer;
const producerOptions : MLKafkaJsonProducerOptions = {
  kafkaBrokerList: KAFKA_URL,
  producerClientId: `${BC_NAME}_${APP_NAME}`,
  skipAcknowledgements: true,

};

// DB
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

// Quotes
const DB_NAME_QUOTES = process.env.QUOTING_DB_NAME ?? "quoting";

let quotesRepo: IQuoteRepo;

// Bulk Quotes
const DB_NAME_BULK_QUOTES = process.env.QUOTING_DB_NAME ?? "quoting";

let bulkQuotesRepo: IBulkQuoteRepo;

// Aggregate
let aggregate: QuotingAggregate;

// Auth Requester
let authRequester: IAuthenticatedHttpRequester;


// Participant service
const fixedToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Iml2SC1pVUVDRHdTVnVGS0QtRzdWc0MzS0pnLXN4TFgteWNvSjJpOTFmLTgifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbIjI2ODBjYTRhLTRhM2EtNGU5YS1iMWZhLTY1MDAyMjkyMTAwOSJdLCJpYXQiOjE2NzE1MzYyNTYsImV4cCI6MTY3MjE0MTA1NiwiYXVkIjoibW9qYWxvb3Audm5leHQuZGVmYXVsdF9hdWRpZW5jZSIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzIwMS8iLCJzdWIiOiJ1c2VyOjp1c2VyIiwianRpIjoiMWYxMzhkZjctMjg1OC00MWNmLThkYTctYTRiYTNhZTZkMGZlIn0.WSn0M73nMXRQhZ1nzpc2YEOBcV5uUupR5aMvxhiAHKylGChzB_gEtikijnUFDw2o5tVYVeiyeKe2_CRPOQ5KTt3VxCBXheMIxekmNE6U9pZY5fsUrphfMb5j886IMiiR-ai25-MplCoaKmsbd1M4HFT8bcjongiXFVkSUmKgG4Q1YyrjnROxH5-xMjDGL1icZNlTjRxYC5BbfiTfw8TSgfdrBVY_v7tE-MRdoI6bVaMfwib_bNfpTHMLt0tx2ca90WKU0IuXOqNMuZv0s-AwmstVA0qiM10Jc4p5A7nQjnLH3cX_X17Gz6lFd8hpDzl7gtSJGD-YvCg-xQn_cGAO0g";
let participantService: IParticipantService;

// Account Lookup service
const ACCOUNT_LOOKUP_SVC_BASEURL = process.env["ACCOUNT_LOOKUP_SVC_BASEURL"] || "http://localhost:3030";
let accountLookupService: IAccountLookupService;

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3033;
let expressApp: Express;

// Admin routes
let quotingAdminRoutes: QuotingAdminExpressRoutes;

export async function start(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer,
  quoteRegistryParam?:IQuoteRepo, bulkQuoteRegistryParam?:IBulkQuoteRepo, authRequesterParam?:IAuthenticatedHttpRequester, participantServiceParam?:IParticipantService, accountLookupServiceParam?:IAccountLookupService, aggregateParam?:QuotingAggregate,
  ):Promise<void> {
  console.log(`Quoting-svc - service starting with PID: ${process.pid}`);

  try{

    await initExternalDependencies(loggerParam, messageConsumerParam, messageProducerParam, quoteRegistryParam, bulkQuoteRegistryParam, authRequesterParam, participantServiceParam, accountLookupServiceParam);

    messageConsumer.setTopics([QuotingBCTopics.DomainRequests]);
    await messageConsumer.connect();
    await messageConsumer.start();
    logger.info("Kafka Consumer Initialized");

    await messageProducer.connect();
    logger.info("Kafka Producer Initialized");

    await quotesRepo.init();
    logger.info("Quote Registry Repo Initialized");

    await bulkQuotesRepo.init();
    logger.info("Bulk Quote Registry Repo Initialized");

    aggregate = aggregateParam ?? new QuotingAggregate(logger, quotesRepo, bulkQuotesRepo, messageProducer, participantService, accountLookupService);
    logger.info("Aggregate Initialized");

    const callbackFunction = async (message:IMessage):Promise<void> => {
      logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      await aggregate.handleQuotingEvent(message);
    };

    messageConsumer.setCallbackFn(callbackFunction);

    // Start express server
    expressApp = express();
    expressApp.use(express.json()); // for parsing application/json
    expressApp.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

    // Add admin and client http routes
    quotingAdminRoutes = new QuotingAdminExpressRoutes(aggregate, logger);
    expressApp.use("", quotingAdminRoutes.mainRouter);

    expressApp.use((req, res) => {
      // catch all
      res.send(404);
    });

    expressApp.listen(SVC_DEFAULT_HTTP_PORT, () => {
      logger.info(`🚀 Server ready at: http://localhost:${SVC_DEFAULT_HTTP_PORT}`);
      logger.info("Quoting Admin server started");
    });

  }
  catch(err){
    logger.error(err);
    await stop();
  }
}

async function initExternalDependencies(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer,

  quoteRegistryParam?:IQuoteRepo, bulkQuoteRegistryParam?:IBulkQuoteRepo, authRequesterParam?: IAuthenticatedHttpRequester, participantServiceParam?: IParticipantService, accountLookupServiceParam?: IAccountLookupService):Promise<void>  {

  logger = loggerParam ?? new KafkaLogger(BC_NAME, APP_NAME, APP_VERSION,{kafkaBrokerList: KAFKA_URL}, KAFKA_LOGS_TOPIC,DEFAULT_LOGLEVEL);

  if (!loggerParam) {
      await (logger as KafkaLogger).init();
      logger.info("Kafka Logger Initialized");
  }

  quotesRepo = quoteRegistryParam ?? new MongoQuotesRepo(logger,MONGO_URL, DB_NAME_QUOTES);

  bulkQuotesRepo = bulkQuoteRegistryParam ?? new MongoBulkQuotesRepo(logger,MONGO_URL, DB_NAME_BULK_QUOTES);

  messageProducer = messageProducerParam ?? new MLKafkaJsonProducer(producerOptions, logger);

  messageConsumer = messageConsumerParam ?? new MLKafkaJsonConsumer(consumerOptions, logger);


  if(!authRequesterParam){
    const AUTH_TOKEN_ENPOINT = "http://localhost:3201/token";
    const USERNAME = "admin";
    const PASSWORD = "superMegaPass";
    const CLIENT_ID = "security-bc-ui";
    authRequester = new AuthenticatedHttpRequester(logger, AUTH_TOKEN_ENPOINT);
    authRequester.setUserCredentials(CLIENT_ID, USERNAME, PASSWORD);
  }
  else {
    authRequester = authRequesterParam;
  }

  if(!participantServiceParam){
    const participantLogger = logger.createChild("participantLogger");
    participantLogger.setLogLevel(LogLevel.INFO);
    const PARTICIPANTS_BASE_URL = "http://localhost:3010";
    const HTTP_CLIENT_TIMEOUT_MS = 10_000;
    participantService = new ParticipantAdapter(participantLogger, PARTICIPANTS_BASE_URL, authRequester, HTTP_CLIENT_TIMEOUT_MS);

  }
  else {
    participantService = participantServiceParam;
  }

  accountLookupService = accountLookupServiceParam ?? new AccountLookupAdapter(logger, ACCOUNT_LOOKUP_SVC_BASEURL, fixedToken);

}

export async function stop(): Promise<void> {
  logger.debug("Tearing down quote Registry");
  await quotesRepo.destroy();
  logger.debug("Tearing down bulk quote Registry");
  await bulkQuotesRepo.destroy();
  logger.debug("Tearing down message consumer");
  await messageConsumer.destroy(true);
  logger.debug("Tearing down message producer");
  await messageProducer.destroy();
}

/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
  console.info(`Service - ${signal} received - cleaning up...`);
  let clean_exit = false;
  setTimeout(() => { clean_exit || process.abort();}, 5000);

  // call graceful stop routine
  await stop();

  clean_exit = true;
  process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on("exit", async () => {
  logger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
  logger.error(err);
  console.log("UncaughtException - EXITING...");
  process.exit(999);
});
