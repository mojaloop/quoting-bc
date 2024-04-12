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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { AccountLookupHttpClient } from "@mojaloop/account-lookup-bc-client-lib";
import { IAccountLookupService } from "@mojaloop/quoting-bc-domain-lib";
import { GetAccountLookupAdapterError } from "../errors";
import {IAuthenticatedHttpRequester} from "@mojaloop/security-bc-public-types-lib";
import Redis from "ioredis";

const HTTP_CLIENT_TIMEOUT_MS = 10_000;
const DEFAULT_REDIS_CACHE_DURATION_SECS = 5; // 5 secs

interface ICacheRecord {
    fspId: string;
    partyType: string;
    partyId: string;
    partySubType: string | null;
    currency: string | null;
}

export class AccountLookupAdapter implements IAccountLookupService {
	private readonly _logger: ILogger;
	private readonly _clientBaseUrl: string;
	private readonly _externalAccountLookupClient: AccountLookupHttpClient;
	private readonly _authRequester: IAuthenticatedHttpRequester;
	private readonly _requestTimeout: number;

    private readonly _redisClient: Redis;
    private readonly _redisKeyPrefix= "quotingAlsCache";
    private readonly _redisCacheDurationSecs:number;

    constructor(
		logger: ILogger,
		clientBaseUrl: string,
		authRequester: IAuthenticatedHttpRequester,
        redisHost: string, redisPort: number, redisCacheDurationSecs: number,
        requestTimeout: number = HTTP_CLIENT_TIMEOUT_MS
		) {
		this._logger = logger.createChild(this.constructor.name);
		this._clientBaseUrl = clientBaseUrl;
		this._authRequester = authRequester;
		this._requestTimeout = requestTimeout;
		this._externalAccountLookupClient = new AccountLookupHttpClient(logger, this._clientBaseUrl, this._authRequester, this._requestTimeout);

        this._redisClient = new Redis({
            port: redisPort,
            host: redisHost,
            lazyConnect: true
        });
	}

    async init(): Promise<void> {
        try{
            await this._redisClient.connect();
            this._logger.debug("Connected to Redis successfully");
        }catch(error: unknown){
            this._logger.error(`Unable to connect to redis cache: ${(error as Error).message}`);
            throw error;
        }
    }

    private _getKeyWithPrefix (partyType: string, partyId: string, currency: string | null): string {
        return `${this._redisKeyPrefix}_${partyType}_${partyId}_${currency}`;
    }

    private async _getFromCache(
        partyType: string,
        partyId: string,
        //partySubType: string | null,
        currency: string | null
    ):Promise<ICacheRecord | null>{
        const objStr = await this._redisClient.get(this._getKeyWithPrefix(partyType, partyId, currency));
        if(!objStr) return null;

        try{
            const obj = JSON.parse(objStr);

            // manual conversion for any non-primitive props or children
            return obj;
        }catch (e) {
            this._logger.error(e);
            return null;
        }
    }

    private async _setToCache(record:ICacheRecord):Promise<void>{
        const key = this._getKeyWithPrefix(record.partyType, record.partyId, record.currency);
        await this._redisClient.setex(key, this._redisCacheDurationSecs, JSON.stringify(record));
    }

	async getAccountLookup(partyType:string, partyId:string, currency:string | null): Promise<string| null> {
		try {
            const cacheData = await this._getFromCache(partyType, partyId, currency);
            if (cacheData){
                return cacheData.fspId;
            }

            this._logger.isDebugEnabled() && this._logger.debug(
                `getAccountLookup: calling external account lookup service for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`
            );
			const result = await this._externalAccountLookupClient.participantLookUp(partyType, partyId,currency);

            if(result) {
                this._logger.isDebugEnabled() && this._logger.debug( `getAccountLookup: caching result for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);

                await this._setToCache({
                    fspId: result,
                    partyType: partyType,
                    partyId: partyId,
                    currency, partySubType: null
                });
				return result;
			}
			return null;

		} catch (e: unknown) {
			this._logger.error(`getAccountLookup: error getting for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency}`, e);
			throw new GetAccountLookupAdapterError("Error calling external account lookup service");
		}
	}

}
