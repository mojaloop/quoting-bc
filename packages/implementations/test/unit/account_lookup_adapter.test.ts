// // /*****
// //  License
// //  --------------
// //  Copyright © 2017 Bill & Melinda Gates Foundation
// //  The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

// //  http://www.apache.org/licenses/LICENSE-2.0

// //  Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

// //  Contributors
// //  --------------
// //  This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
// //  Names of the original copyright holders (individuals or organizations)
// //  should be listed with a '*' in the first column. People who have
// //  contributed from an organization can be listed under the organization
// //  that actually holds the copyright for their contributions (see the
// //  Gates Foundation organization for an example). Those individuals should have
// //  their names indented and be marked with a '-'. Email address can be added
// //  optionally within square brackets <email>.

// //  * Arg Software
// //  - José Antunes <jose.antunes@arg.software>
// //  - Rui Rocha <rui.rocha@arg.software>

// //  --------------
// // ******/

"use strict";

import {LogLevel, ILogger, ConsoleLogger} from '@mojaloop/logging-bc-public-types-lib';
import { IAccountLookupService } from "@mojaloop/quoting-bc-domain";
import { ILocalCache, LocalCache } from "../../src/local_cache";
import { AccountLookupHttpClient } from "@mojaloop/account-lookup-bc-client-lib";
import { AccountLookupAdapter } from '../../src/external_adapters/account_lookup_adapter';

const BASE_URL_ACCOUNT_LOOKUP_CLIENT: string = "http://localhost:1234";
const FAKE_TOKEN = "fakeToken";

const getFspIdByTypeAndIdSpy = jest.fn();
const getFspIdByTypeAndIdAndSubIdSpy = jest.fn();

jest.mock("@mojaloop/account-lookup-bc-client-lib", () => {
        return {
            AccountLookupHttpClient: jest.fn().mockImplementation(() => { 
                return {
                    getFspIdByTypeAndId: getFspIdByTypeAndIdSpy,
                    getFspIdByTypeAndIdAndSubId: getFspIdByTypeAndIdAndSubIdSpy
            }
        })
    }
});

let accountLookupClient: IAccountLookupService;
let localCache: ILocalCache;
 
describe("Account Lookup Client - Unit Tests", () => {
    beforeAll(async () => {
         const logger: ILogger = new ConsoleLogger();
         logger.setLogLevel(LogLevel.FATAL);
         localCache = new LocalCache(logger);         
         accountLookupClient = new AccountLookupAdapter(
             logger,
             BASE_URL_ACCOUNT_LOOKUP_CLIENT,
             FAKE_TOKEN,
             localCache
         );
     });

    afterEach(() => {
        jest.restoreAllMocks();
        localCache.destroy();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });
 
    test("should return null if couldnt get fspId by partyId and partyType", async () => {
        // Arrange
        getFspIdByTypeAndIdSpy.mockResolvedValueOnce(null);

        // Act
        const fspId = await accountLookupClient.getAccountFspId("MSISDN", "partyType", null,null);

        // Assert
        expect(fspId).toBeNull();
    });

    test("should return fspId by partyId and partyType", async () => {
        // Arrange
        const fspId = "fspId";
        getFspIdByTypeAndIdSpy.mockResolvedValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountFspId("MSISDN", "partyType", null,null);

        // Assert
        expect(fspIdResult).toEqual(fspId);
    });

    test("should return cached fspId by partyId and partyType", async () => {
        // Arrange
        const fspId = "fspId";
        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountFspId("MSISDN", "partyType", null,null);

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(fspIdResult).toEqual(fspId);
    });

    test("should return null if couldnt get fspId by partyId, partyType and partySubId", async () => {
        // Arrange
        getFspIdByTypeAndIdAndSubIdSpy.mockResolvedValueOnce(null);

        // Act
        const fspId = await accountLookupClient.getAccountFspId("MSISDN", "partyType", "partySubId",null);

        // Assert
        expect(fspId).toBeNull();
    });

    test("should return fspId by partyId, partyType and partySubId", async () => {
        // Arrange
        const fspId = "fspId";
        getFspIdByTypeAndIdAndSubIdSpy.mockResolvedValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountFspId("MSISDN", "partyType", "partySubId",null);

        // Assert
        expect(fspIdResult).toEqual(fspId);
    });

    test("should return cached fspId by partyId, partyType and partySubId", async () => {
        // Arrange
        const fspId = "fspId";
        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountFspId("MSISDN", "partyType", "partySubId",null);

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(fspIdResult).toEqual(fspId);
    });

    test("should call getFspIdByTypeAndIdAndSubId if partySubId is null", async () => {
        // Arrange
        const fspId = "fspId";
        getFspIdByTypeAndIdSpy.mockResolvedValueOnce(fspId);

        // Act
        await accountLookupClient.getAccountFspId("MSISDN", "partyType", null, null);

        // Assert
        expect(getFspIdByTypeAndIdAndSubIdSpy).toBeCalledTimes(0);
        expect(getFspIdByTypeAndIdSpy).toBeCalledTimes(1);
    });

    test("should call getFspIdByTypeAndIdAndSubId if partySubId is not null", async () => {
        // Arrange
        const fspId = "fspId";
        getFspIdByTypeAndIdAndSubIdSpy.mockResolvedValueOnce(fspId);

        // Act
        await accountLookupClient.getAccountFspId("MSISDN", "partyType", "partySubId", null);

        // Assert
        expect(getFspIdByTypeAndIdAndSubIdSpy).toBeCalledTimes(1);
        expect(getFspIdByTypeAndIdSpy).toBeCalledTimes(0);
    });
    
});
