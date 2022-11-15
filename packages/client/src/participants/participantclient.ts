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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import axios, {AxiosInstance, AxiosResponse} from "axios";
import { IParticipant, IParticipantService } from "@mojaloop/quoting-bc-domain";
import { ILocalCache, LocalCache } from "@mojaloop/quoting-bc-infrastructure";

export class ParticipantClient implements IParticipantService {
	private readonly logger: ILogger;
	private readonly httpClient: AxiosInstance;
	private readonly _localCache: ILocalCache;
	private validateStatus = (status: number): boolean => status === 200;

	constructor(
		logger: ILogger,
		baseUrlHttpService?: string,
		localCache?: ILocalCache,
	) {
		this.logger = logger;

		this.httpClient = axios.create({
			baseURL: baseUrlHttpService,
		});

		this._localCache = localCache ?? new LocalCache(logger);
	}

	async getParticipantInfo(fspId: string): Promise<IParticipant| null> {
		const result = this._localCache.get("getParticipantInfo", fspId) as IParticipant;
		
		if (result) {
			this.logger.debug(`getParticipantInfo: returning cached result for fspId: ${fspId}`);
			return result;
		}
		
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get("/participants", { params: { fspId: fspId },validateStatus: this.validateStatus });
			this._localCache.set(axiosResponse.data, "getParticipantInfo", fspId);
			return axiosResponse.data;
		} catch (e: unknown) {
			this.logger.error(`getParticipantInfo: error getting participant info for fspId: ${fspId} - ${e}`);
			return null;
		}
	}

	async getParticipantsInfo(fspIds: string[]): Promise<IParticipant[]> {
		const result: IParticipant[] = [];
		

		for (const fspId of fspIds) {
			result.push(this._localCache.get("getParticipantInfo", fspId) as IParticipant);
		}
		
		if (result.every(participant => fspIds.includes(participant.id))) {
			this.logger.debug(`getParticipantInfo: returning cached result for fspId list: ${fspIds}`);
			return result;
		}
		
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get("/participants", { params: { fspIds: fspIds },validateStatus: this.validateStatus });

			for (const fspId of axiosResponse.data) {
				this._localCache.set(axiosResponse.data, "getParticipantInfo", fspId);
			}

			return axiosResponse.data;
		} catch (e: unknown) {
			this.logger.error(`getParticipantInfo: error getting participants info for fspIds: ${fspIds} - ${e}`);
			return [];
		}
	}
}
