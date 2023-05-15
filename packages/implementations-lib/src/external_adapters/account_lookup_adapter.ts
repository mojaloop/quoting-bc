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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { AccountLookupHttpClient } from "@mojaloop/account-lookup-bc-client-lib";
import { AccountLookupBulkQuoteFspIdRequest, IAccountLookupService } from "@mojaloop/quoting-bc-domain-lib";
import { ILocalCache, LocalCache } from "../local_cache";
import { GetAccountLookupAdapterError, GetBulkAccountLookupAdapterError } from "../errors";

export class AccountLookupAdapter implements IAccountLookupService {
	private readonly _logger: ILogger;
	private readonly _localCache: ILocalCache;
	private readonly _clientBaseUrl: string;
	private readonly _externalAccountLookupClient: AccountLookupHttpClient;
	private token: string;

	constructor(
		logger: ILogger,
		clientBaseUrl: string,
		token: string,
		localCache?: ILocalCache
	) {
		this._logger = logger;
		this.token = token;
		this._clientBaseUrl = clientBaseUrl;
		this._externalAccountLookupClient = new AccountLookupHttpClient(this._logger, this._clientBaseUrl);
		this._localCache = localCache ?? new LocalCache(logger);
	}

	async getBulkAccountLookup(partyIdentifiers: AccountLookupBulkQuoteFspIdRequest): Promise<{[key: string]: string | null}> {
		let result: { [key: string]: string | null; } = {};

		for (const key of Object.keys(partyIdentifiers)) {
			const partyId = partyIdentifiers[key].partyId;
			const partyType = partyIdentifiers[key].partyType;
			const currency = partyIdentifiers[key]?.currency;

			this._logger.debug(`getBulkAccountLookup: checking cache for key: ${key} or partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);
			const cachedResult = this._localCache.get(partyId, partyType,currency);

			if (cachedResult) {
				this._logger.debug(`getBulkAccountLookup: returning cached result for key: ${key}`);
				result[key] = cachedResult.toString();
				delete partyIdentifiers[key];
			}
		}

		try {
			//check if there are any partyIdentifiers left to lookup
			if (Object.keys(partyIdentifiers).length === 0) {
				return result;
			}

			this._logger.debug(`getBulkAccountLookup: calling external account lookup service for partyIdentifiers: ${JSON.stringify(partyIdentifiers)}`);



			const externalFspIds = await this._externalAccountLookupClient.participantBulkLookUp(partyIdentifiers);
			result = {...result, ...externalFspIds};
		} catch (e: unknown) {
			this._logger.error(`getBulkAccountLookup: error calling external account lookup service for partyIdentifiers: ${JSON.stringify(partyIdentifiers)}, error: ${e}`);
			throw new GetBulkAccountLookupAdapterError("Error calling external account lookup service");
		}

		this._logger.debug("getBulkAccountLookup: caching result for partyIdentifiers");

		try {
			for (const [key] of Object.entries(partyIdentifiers)) {
				this._logger.debug(`getBulkAccountLookup: caching result for partyId: ${partyIdentifiers[key]?.partyId}, partyType ${partyIdentifiers[key]?.partyType}, currency: ${partyIdentifiers[key]?.currency}`);
				this._localCache.set(result[key],  partyIdentifiers[key]?.partyId, partyIdentifiers[key]?.partyType, partyIdentifiers[key]?.currency);
			}
		}
		catch (e: unknown) {
			this._logger.error(`getBulkAccountLookup: error caching result for partyIdentifiers: ${JSON.stringify(partyIdentifiers)}, error: ${e}`);
		}

		return result;

	}

	async getAccountLookup(partyId:string, partyType:string, currency:string | null): Promise<string| null> {
		const cachedResult = this._localCache.get(partyId, partyType, currency);
		if (cachedResult) {
			this._logger.info(`getAccountLookup: returning cached result for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);
			return cachedResult.toString();
		}
		try {
			this._logger.info(`getAccountLookup: calling external account lookup service for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);
			const result = await this._externalAccountLookupClient.participantLookUp(partyId, partyType, currency);

			if(result) {
				this._logger.info(`getAccountLookup: caching result for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);
				this._localCache.set(result, partyId, partyType, currency);
			}
			return result;
		} catch (e: unknown) {
			this._logger.error(`getAccountLookup: error getting for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} - ${e}`);
			throw new GetAccountLookupAdapterError("Error calling external account lookup service");
		}
	}

}
