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

import {
	QuotingAggregate,
	IQuoteRepo,
	IBulkQuoteRepo,
	IParticipantService,
	IAccountLookupService,
	IQuoteSchemeRules,
	QuotingPrivilegesDefinition
} from "@mojaloop/quoting-bc-domain-lib";
import {IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
	MLKafkaJsonConsumer,
	MLKafkaJsonProducer,
	MLKafkaJsonConsumerOptions,
	MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {QuotingBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
	MongoQuotesRepo,
	MongoBulkQuotesRepo,
	ParticipantAdapter,
	AccountLookupAdapter
} from "@mojaloop/quoting-bc-implementations-lib";
import {Server} from "net";
import process from "process";
import {QuotingAdminExpressRoutes} from "./routes/quote_admin_routes";
import express, {Express} from "express";
import {
	AuthenticatedHttpRequester, AuthorizationClient, TokenHelper,
} from "@mojaloop/security-bc-client-lib";
import {IAuthenticatedHttpRequester, IAuthorizationClient, ITokenHelper} from "@mojaloop/security-bc-public-types-lib";
import crypto from "crypto";
import {IConfigurationClient , Currency} from "@mojaloop/platform-configuration-bc-public-types-lib";
import { DefaultConfigProvider, ConfigurationClient, IConfigProvider } from "@mojaloop/platform-configuration-bc-client-lib";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../package.json");

// Global vars
const BC_NAME = "quoting-bc";
const APP_NAME = "quoting-svc";
const APP_VERSION = packageJSON.version;

// service constants
// const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

// infra & dbs
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

// const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";
//const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

// security
const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

// Other services
const ACCOUNT_LOOKUP_SVC_URL = process.env["ACCOUNT_LOOKUP_SVC_URL"] || "http://localhost:3030";
const PARTICIPANTS_SVC_URL = process.env["PARTICIPANTS_SVC_URL"] || "http://localhost:3010";

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3033;

// Quotes BD names
const DB_NAME_BULK_QUOTES = "quoting";
const DB_NAME_QUOTES = "quoting";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "quoting-bc-quoting-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const HTTP_CLIENT_TIMEOUT_MS = 10_000;
const PARTICIPANTS_CACHE_TIMEOUT_MS =
    (process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"] && parseInt(process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"])) ||
    30 * 1000;

const consumerOptions: MLKafkaJsonConsumerOptions = {
	kafkaBrokerList: KAFKA_URL,
	kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

// Application variables
const PASS_THROUGH_MODE = (process.env["PASS_THROUGH_MODE"]=== "true" )? true : false;
let SCHEME_RULES: IQuoteSchemeRules = {
	currencies: [],
};

const producerOptions: MLKafkaJsonProducerOptions = {
	kafkaBrokerList: KAFKA_URL,
	producerClientId: `${BC_NAME}_${APP_NAME}`,
};

// kafka logger
const kafkaProducerOptions = {
	kafkaBrokerList: KAFKA_URL
};

const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}_authz_client`
};

const SERVICE_START_TIMEOUT_MS= (process.env["SERVICE_START_TIMEOUT_MS"] && parseInt(process.env["SERVICE_START_TIMEOUT_MS"])) || 60_000;

const INSTANCE_NAME = `${BC_NAME}_${APP_NAME}`;
const INSTANCE_ID = `${INSTANCE_NAME}__${crypto.randomUUID()}`;

const CONFIG_BASE_URL = process.env["CONFIG_BASE_URL"] || "http://localhost:3100";
const CONFIGSET_VERSION = process.env["CONFIGSET_VERSION"] || "0.0.1";

let globalLogger: ILogger;

export class Service {
	static logger: ILogger;
	static app: Express;
	static expressServer: Server;
	static messageConsumer: IMessageConsumer;
	static messageProducer: IMessageProducer;
	static quotesRepo: IQuoteRepo;
	static bulkQuotesRepo: IBulkQuoteRepo;
	static authRequester: IAuthenticatedHttpRequester;
	static participantService: IParticipantService;
	static accountLookupService: IAccountLookupService;
	static aggregate: QuotingAggregate;
    static startupTimer: NodeJS.Timeout;
    static authorizationClient: IAuthorizationClient;
    static tokenHelper: ITokenHelper;
	static configClient : IConfigurationClient; 
    static  _currencyList: Currency[];

	static async start(
		logger?: ILogger,
		messageConsumer?: IMessageConsumer,
		messageProducer?: IMessageProducer,
		quotesRepo?: IQuoteRepo,
		bulkQuotesRepo?: IBulkQuoteRepo,
		authRequester?: IAuthenticatedHttpRequester,
		participantService?: IParticipantService,
		accountLookupService?: IAccountLookupService,
		aggregate?: QuotingAggregate, // TODO: remove aggregate from here and tests
        authorizationClient?: IAuthorizationClient,
		configProvider?: IConfigProvider,
	): Promise<void> {
		console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

		if (!logger) {
			logger = new KafkaLogger(
				BC_NAME,
				APP_NAME,
				APP_VERSION,
				kafkaProducerOptions,
				KAFKA_LOGS_TOPIC,
				LOG_LEVEL
			);
			await (logger as KafkaLogger).init();
		}
		globalLogger = this.logger = logger.createChild("Service");

		if (!configProvider) {
			// use default url from PLATFORM_CONFIG_CENTRAL_URL env var
			const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
			authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

			const messageConsumer = new MLKafkaJsonConsumer({
				kafkaBrokerList: KAFKA_URL,
				kafkaGroupId: `${APP_NAME}_${Date.now()}` // unique consumer group - use instance id when possible
			}, logger.createChild("configClient.consumer"));
			configProvider = new DefaultConfigProvider(logger, authRequester, messageConsumer, CONFIG_BASE_URL);

		}

		this.configClient = new ConfigurationClient(BC_NAME, APP_NAME, APP_VERSION, CONFIGSET_VERSION, configProvider);
			await this.configClient.init();
			await this.configClient.bootstrap(true);
			await this.configClient.fetch();

		// Configs:
		this._currencyList = this.configClient.globalConfigs.getCurrencies();
		const currencyCodes: string[] = this._currencyList.map(currency => currency.code);
		SCHEME_RULES = {
			currencies : currencyCodes
		};
		/*
		// start auditClient
		if (!auditClient) {
			if (!existsSync(AUDIT_KEY_FILE_PATH)) {
				if (PRODUCTION_MODE) process.exit(9);
				// create e tmp file
				LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
			}
			const auditLogger = logger.createChild("AuditLogger");
			auditLogger.setLogLevel(LogLevel.INFO);
			const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
			const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, auditLogger);
			// NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialised already
			auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
			await auditClient.init();
		}
		this.auditClient = auditClient;
		*/



		//TODO: parse scheme rules to object
		// let schemeRules: IQuoteSchemeRules;
		// try{
		// 	schemeRules = JSON.parse(SCHEME_RULES as string);
		// }
		// catch(e: any){
		// 	logger.error(`Invalid SCHEMA_RULES: ${e.message}`);
		// 	throw new Error("Invalid SCHEMA_RULES");
		// }


		if(!quotesRepo){
			quotesRepo = new MongoQuotesRepo(this.logger, MONGO_URL, DB_NAME_QUOTES);
		}
		this.quotesRepo = quotesRepo;

		if (!bulkQuotesRepo) {
			bulkQuotesRepo = new MongoBulkQuotesRepo(this.logger, MONGO_URL, DB_NAME_BULK_QUOTES);
		}
		this.bulkQuotesRepo = bulkQuotesRepo;

		if(!messageProducer){
			messageProducer = new MLKafkaJsonProducer(producerOptions, this.logger);
		}
		this.messageProducer = messageProducer;

		if (!messageConsumer) {
			messageConsumer = new MLKafkaJsonConsumer(consumerOptions, this.logger);
		}
		this.messageConsumer = messageConsumer;


		if (!authRequester) {
			authRequester = new AuthenticatedHttpRequester(this.logger, AUTH_N_SVC_TOKEN_URL);
			authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
		}
		this.authRequester = authRequester;


		if (!participantService) {
			// const participantLogger = logger.createChild("participantLogger");
			// participantLogger.setLogLevel(LogLevel.INFO);
			participantService = new ParticipantAdapter(this.logger, PARTICIPANTS_SVC_URL, this.authRequester, PARTICIPANTS_CACHE_TIMEOUT_MS);

		}
		this.participantService = participantService;

		if(!accountLookupService){
			accountLookupService = new AccountLookupAdapter(this.logger, ACCOUNT_LOOKUP_SVC_URL, authRequester, HTTP_CLIENT_TIMEOUT_MS);
		}
		this.accountLookupService = accountLookupService;

		this.messageConsumer.setTopics([QuotingBCTopics.DomainRequests]);
		await this.messageConsumer.connect();
		await this.messageConsumer.startAndWaitForRebalance();
		this.logger.info("Kafka Consumer Initialized");

		await this.messageProducer.connect();
		this.logger.info("Kafka Producer Initialized");

		await this.quotesRepo.init();
		this.logger.info("Quote Registry Repo Initialized");

		await bulkQuotesRepo.init();
		logger.info("Bulk Quote Registry Repo Initialized");

		if(!aggregate){
			aggregate = new QuotingAggregate(this.logger, this.quotesRepo, this.bulkQuotesRepo, this.messageProducer, this.participantService, this.accountLookupService, PASS_THROUGH_MODE, SCHEME_RULES);
		}

		this.aggregate = aggregate;

		logger.info("Aggregate Initialized");

		this.messageConsumer.setCallbackFn(this.aggregate.handleQuotingEvent.bind(this.aggregate));

		// authorization client
		if (!authorizationClient) {
            // create the instance of IAuthenticatedHttpRequester
            const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
            authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

            const messageConsumer = new MLKafkaJsonConsumer(
                {
                    kafkaBrokerList: KAFKA_URL,
                    kafkaGroupId: `${BC_NAME}_${APP_NAME}_authz_client`
                }, logger.createChild("authorizationClientConsumer")
            );

            // setup privileges - bootstrap app privs and get priv/role associations
            authorizationClient = new AuthorizationClient(
                BC_NAME, APP_NAME, APP_VERSION,
                AUTH_Z_SVC_BASEURL, logger.createChild("AuthorizationClient"),
                authRequester,
                messageConsumer
            );

            authorizationClient.addPrivilegesArray(QuotingPrivilegesDefinition);
            await (authorizationClient as AuthorizationClient).bootstrap(true);
            await (authorizationClient as AuthorizationClient).fetch();
            // init message consumer to automatically update on role changed events
            await (authorizationClient as AuthorizationClient).init();
		}
		this.authorizationClient = authorizationClient;

		// token helper
		this.tokenHelper = new TokenHelper(
            AUTH_N_SVC_JWKS_URL,
            logger,
            AUTH_N_TOKEN_ISSUER_NAME,
            AUTH_N_TOKEN_AUDIENCE,
            new MLKafkaJsonConsumer({kafkaBrokerList: KAFKA_URL, autoOffsetReset: "earliest", kafkaGroupId: INSTANCE_ID}, logger) // for jwt list - no groupId
        );
		await this.tokenHelper.init();

		await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);
	}

	static async setupExpress(): Promise<void> {
		return new Promise<void>(resolve => {
			// Start express server
			this.app = express();
			this.app.use(express.json()); // for parsing application/json
			this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

			// Add admin and client http routes
			const quotingAdminRoutes = new QuotingAdminExpressRoutes(this.quotesRepo, this.bulkQuotesRepo, this.logger, this.tokenHelper, this.authorizationClient);
			this.app.use("", quotingAdminRoutes.mainRouter);

			this.app.use((req, res) => {
				// catch all
				res.send(404);
			});

			this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
				this.logger.info(`🚀 Server ready at port: :${SVC_DEFAULT_HTTP_PORT}`);
				this.logger.info(`Quoting Admin server started with v: ${APP_VERSION}`);
				resolve();
			});
		});
	}

	static async stop(): Promise<void> {
		if (this.expressServer)
			this.expressServer.close();
		this.logger.debug("Tearing down message consumer");
		await this.messageConsumer.destroy(true);
		this.logger.debug("Tearing down message producer");
		await this.messageProducer.destroy();

		this.logger.debug("Tearing down quote Registry");
		await this.quotesRepo.destroy();
		this.logger.debug("Tearing down bulk quote Registry");
		await this.bulkQuotesRepo.destroy();
	}
}


/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
	console.info(`Service - ${signal} received - cleaning up...`);
	let clean_exit = false;
	setTimeout(() => {
		clean_exit || process.abort();
	}, 5000);

	// call graceful stop routine
	await Service.stop();

	clean_exit = true;
	process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on("exit", async () => {
	globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
	globalLogger.error(err);
	console.log("UncaughtException - EXITING...");
	process.exit(999);
});
