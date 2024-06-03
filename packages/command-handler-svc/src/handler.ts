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

import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {CommandMsg, IMessage, IMessageConsumer, MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {QuotingBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {IGauge, IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";

import { QuotingAggregate} from "@mojaloop/quoting-bc-domain-lib";

export class QuotingCommandHandler{
	private _logger: ILogger;
	private _auditClient: IAuditClient;
	private _messageConsumer: IMessageConsumer;
	private _quotingAgg:  QuotingAggregate ;
    private _histo:IHistogram;
    private _batchSizeGauge:IGauge;

    constructor(logger: ILogger, auditClient:IAuditClient, messageConsumer: IMessageConsumer, metrics:IMetrics, quotingAgg:  QuotingAggregate) {
		this._logger = logger.createChild(this.constructor.name);
		this._auditClient = auditClient;
		this._messageConsumer = messageConsumer;
		this._quotingAgg = quotingAgg;

        this._histo = metrics.getHistogram("QuotingCommandHandler", "QuotingCommandHandler calls", ["callName", "success"]);
        this._batchSizeGauge = metrics.getGauge("QuotingCommandHandler_batchSize");
	}

	async start():Promise<void>{
		// create and start the consumer handler
        this._messageConsumer.setTopics([QuotingBCTopics.DomainCommands]);
        this._messageConsumer.setBatchCallbackFn(this._batchMsgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
	}

    private async _batchMsgHandler(receivedMessages: IMessage[]): Promise<void>{
        // filter out non-commands
        receivedMessages = receivedMessages.filter(msg => msg.msgType===MessageTypes.COMMAND);
        if(!receivedMessages || receivedMessages.length<=0) return;

        const startTime = Date.now();
        const timerEndFn = this._histo.startTimer({ callName: "batchMsgHandler"});

        this._logger.isDebugEnabled() && this._logger.debug(`Got message batch in QuotingCommandHandler batch size: ${receivedMessages.length}`);
        this._batchSizeGauge.set(receivedMessages.length);

        try{
            await this._quotingAgg.processCommandBatch(receivedMessages as CommandMsg[]);
            timerEndFn({ success: "true" });
        }catch(err: unknown){
            timerEndFn({ success: "false" });
            const error = (err as Error);
            this._logger.error(err, `QuotingCommandHandler - failed processing batch - Error: ${error.message || error.toString()}`);
            // TODO Don't suppress the exception - find proper exception but make sure the app dies
            throw err;
        }finally {
            this._logger.isDebugEnabled() && this._logger.debug(`  Completed batch in QuotingCommandHandler batch size: ${receivedMessages.length}`);
            this._logger.isDebugEnabled() && this._logger.debug(`  Took: ${Date.now()-startTime} ms \n\n`);
        }
    }

	async stop():Promise<void>{
		await this._messageConsumer.stop();
	}

}
