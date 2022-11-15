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

import {QuotingAggregate, IOracleFinder, IOracleProviderFactory, IParticipantService} from "@mojaloop/quoting-bc-domain";
import {IMessage, IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer, MLKafkaJsonConsumerOptions, MLKafkaJsonProducerOptions } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { ParticipantClient } from "@mojaloop/quoting-bc-client";
import { QuotingBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";

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

//Oracles

let oracleFinder: IOracleFinder;
let oracleProviderFactory: IOracleProviderFactory;

// Aggregate
let aggregate: QuotingAggregate;

// Participant routes
let participantService: IParticipantService;

export async function start(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer,
    participantServiceParam?:IParticipantService, aggregateParam?:QuotingAggregate,
  ):Promise<void> {
  console.log(`Quoting-svc - service starting with PID: ${process.pid}`);

  try{
    
    await initExternalDependencies(loggerParam, messageConsumerParam, messageProducerParam, participantServiceParam);

    messageConsumer.setTopics([QuotingBCTopics.DomainRequests]);
    await messageConsumer.connect();
    await messageConsumer.start();
    logger.info("Kafka Consumer Initialized");

    await messageProducer.connect();
   
    logger.info("Kafka Producer Initialized");    
    aggregate = aggregateParam ?? new QuotingAggregate(logger, oracleFinder, oracleProviderFactory, messageProducer, participantService);
    
    await aggregate.init();
    logger.info("Aggregate Initialized");


    const callbackFunction = async (message:IMessage):Promise<void> => {
      logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      await aggregate.handleQuotingEvent(message);
    };
    
    messageConsumer.setCallbackFn(callbackFunction);

  }
  catch(err){
    logger.error(err);
    await stop();
  }
}

async function initExternalDependencies(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, 
  participantServiceParam?: IParticipantService):Promise<void>  {

  logger = loggerParam ?? new KafkaLogger(BC_NAME, APP_NAME, APP_VERSION,{kafkaBrokerList: KAFKA_URL}, KAFKA_LOGS_TOPIC,DEFAULT_LOGLEVEL);
  
  if (!loggerParam) {
    await (logger as KafkaLogger).init();
    logger.info("Kafka Logger Initialized");
  

  messageProducer = messageProducerParam ?? new MLKafkaJsonProducer(producerOptions, logger);
  
  messageConsumer = messageConsumerParam ?? new MLKafkaJsonConsumer(consumerOptions, logger);

  participantService = participantServiceParam ?? new ParticipantClient(logger);
}



export async function stop(): Promise<void> {
  logger.debug("Tearing down aggregate");
  await aggregate.destroy();
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
