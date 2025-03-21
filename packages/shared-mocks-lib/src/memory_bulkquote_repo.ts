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

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { IBulkQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { IBulkQuote } from "@mojaloop/quoting-bc-public-types-lib";

export class MemoryBulkQuoteRepo implements IBulkQuoteRepo {
	private readonly _logger: ILogger;
    private readonly _bulkQuotes: IBulkQuote[] = [];

	constructor(
		logger: ILogger,
	) {
		this._logger = logger;
	}

    init(): Promise<void> {
        return Promise.resolve();
    }
    destroy(): Promise<void> {
        return Promise.resolve();
    }

    addBulkQuote(bulkQuote: IBulkQuote): Promise<string> {
        this._bulkQuotes.push(bulkQuote);
        return Promise.resolve(bulkQuote.bulkQuoteId);
    }
    updateBulkQuote(bulkQuote: IBulkQuote): Promise<void> {
        const bulkQuoteToUpdate = this._bulkQuotes.find(q => q.bulkQuoteId === bulkQuote.bulkQuoteId);
        if (bulkQuoteToUpdate) {
            Object.assign(bulkQuoteToUpdate, bulkQuote);
        } else{
            throw new Error(`Quote with id ${bulkQuote.bulkQuoteId} not found`);
        }
        return Promise.resolve();
    }

    removeBulkQuote(id: string): Promise<void> {
        this._bulkQuotes.splice(this._bulkQuotes.findIndex(q => q.bulkQuoteId === id), 1);
        return Promise.resolve();
    }
    getBulkQuoteById(id: string): Promise<IBulkQuote | null> {
        return Promise.resolve(this._bulkQuotes.find(q => q.bulkQuoteId === id) || null);
    }

    getBulkQuotes(): Promise<IBulkQuote[]> {
        return Promise.resolve(this._bulkQuotes);
    }
}
