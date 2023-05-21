// /*****
//  License
//  --------------
//  Copyright © 2017 Bill & Melinda Gates Foundation
//  The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
//  http://www.apache.org/licenses/LICENSE-2.0
//  Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
//  Contributors
//  --------------
//  This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
//  Names of the original copyright holders (individuals or organizations)
//  should be listed with a '*' in the first column. People who have
//  contributed from an organization can be listed under the organization
//  that actually holds the copyright for their contributions (see the
//  Gates Foundation organization for an example). Those individuals should have
//  their names indented and be marked with a '-'. Email address can be added
//  optionally within square brackets <email>.
//  * Arg Software
//  - José Antunes <jose.antunes@arg.software>
//  - Rui Rocha <rui.rocha@arg.software>
//  --------------
// ******/

"use strict";

import {LogLevel, ILogger, ConsoleLogger} from '@mojaloop/logging-bc-public-types-lib';
import { AccountLookupBulkQuoteFspIdRequest, IAccountLookupService } from "@mojaloop/quoting-bc-domain-lib";
import { ILocalCache, LocalCache } from "../../src/local_cache";
import { AccountLookupAdapter } from '../../src/external_adapters/account_lookup_adapter';

const BASE_URL_ACCOUNT_LOOKUP_CLIENT: string = "http://localhost:1234";
const FAKE_TOKEN = "fakeToken";

const participantLookUpSpy = jest.fn();
const participantBulkLookUpSpy = jest.fn();

jest.mock("@mojaloop/account-lookup-bc-client-lib", () => {
        return {
            AccountLookupHttpClient: jest.fn().mockImplementation(() => {
                return {
                    participantLookUp: participantLookUpSpy,
                    participantBulkLookUp: participantBulkLookUpSpy,
            }
        })
    }
});

let accountLookupClient: IAccountLookupService;
let localCache: ILocalCache;

describe("Account Lookup Adapter - Unit Tests", () => {
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

    test("getAccountLookup - should return null if couldnt get fspId by partyId and partyType", async () => {
        // Arrange
        participantLookUpSpy.mockResolvedValueOnce(null);

        // Act
        const fspId = await accountLookupClient.getAccountLookup("MSISDN", "partyType", null);

        // Assert
        expect(fspId).toBeNull();
    });

    test("getAccountLookup - should return fspId by partyId and partyType", async () => {
        // Arrange
        const fspId = "fspId";
        participantLookUpSpy.mockResolvedValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountLookup("MSISDN", "partyType", null);

        // Assert
        expect(fspIdResult).toEqual(fspId);
    });

    test("getAccountLookup - should return cached fspId by partyId and partyType", async () => {
        // Arrange
        const fspId = "fspId";
        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountLookup("MSISDN", "partyType", null);

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(fspIdResult).toEqual(fspId);
    });


    test("getAccountLookup - should store fspId in cache", async () => {
        // Arrange
        const fspId = "fspId";
        const cacheSpy = jest.spyOn(localCache, "set");
        participantLookUpSpy.mockResolvedValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountLookup("MSISDN", "partyType", null);

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(cacheSpy).toBeCalledWith(fspId, "MSISDN", "partyType", null);
        expect(fspIdResult).toEqual(fspId);
    });



    test("getAccountLookup - should return null if couldnt get fspId by partyId, partyType and currency", async () => {
        // Arrange
        participantLookUpSpy.mockResolvedValueOnce(null);

        // Act
        const fspId = await accountLookupClient.getAccountLookup("MSISDN", "partyType", "currency");

        // Assert
        expect(fspId).toBeNull();
    });

    test("getAccountLookup - should return fspId by partyId, partyType and currency", async () => {
        // Arrange
        const fspId = "fspId";
        participantLookUpSpy.mockResolvedValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountLookup("MSISDN", "partyType", "currenct");

        // Assert
        expect(fspIdResult).toEqual(fspId);
    });

    test("getAccountLookup - should return cached fspId by partyId, partyType and currency", async () => {
        // Arrange
        const fspId = "fspId";
        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce(fspId);

        // Act
        const fspIdResult = await accountLookupClient.getAccountLookup("MSISDN", "partyType", "currency");

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(fspIdResult).toEqual(fspId);
    });

    test("getBulkAccountLookup - should return null for a key that doesnt have a matching fspId", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            },
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        };

        participantBulkLookUpSpy.mockResolvedValueOnce({
            "key1": "fspId1",
            "key2": null,
        });

        // Act
        const result = await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(result).not.toBeNull();
        expect(result?.key1).toBe("fspId1");
        expect(result?.key2).toBeNull();
    });

    test("getBulkAccountLookup - should retrieve data from cache", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            },
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        };

        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce("fspId1")
            .mockReturnValueOnce("fspId2");

        // Act
        const result = await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(cacheSpy).toBeCalledTimes(2);
        expect(participantBulkLookUpSpy.mock.calls.length).toBe(0);
        expect(result).not.toBeNull();
        expect(result?.key1).toBe("fspId1");
        expect(result?.key2).toBe("fspId2");

    });


    test("getBulkAccountLookup - should retrieve data from cache", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            }
        };

        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce("fspId2");

        // Act
        const result = await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(cacheSpy).toBeCalledTimes(1);
        expect(result).not.toBeNull();
        expect(result?.key1).toBe("fspId2");
    });


    test("getBulkAccountLookup - should not call account lookup client if all results are cached", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            },
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        };

        const cacheSpy = jest.spyOn(localCache, "get")
            .mockReturnValueOnce("fspId1")
            .mockReturnValueOnce("fspId2");

        // Act
        const result = await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(participantBulkLookUpSpy.mock.calls.length).toBe(0);

    });


    test("getBulkAccountLookup - should call account lookup client with only one entry since the other one is cached", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            },
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        };

        jest.spyOn(localCache, "get")
            .mockReturnValueOnce("fspId1")
            .mockReturnValueOnce(null)
            .mockReturnValueOnce(null);

        participantBulkLookUpSpy.mockResolvedValueOnce({
            "key2": "fspId2",
        });

        // Act
        const result = await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(result).not.toBeNull();
        expect(participantBulkLookUpSpy.mock.calls).toEqual([[{
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        }]]);
        expect(result?.key1).toBe("fspId1");
        expect(result?.key2).toBe("fspId2");

    });

    test("getBulkAccountLookup - should cacheResults by key and by party identifier", async () => {
        // Arrange
        const request: AccountLookupBulkQuoteFspIdRequest = {
            "key1":{
                currency: "USD",
                partyId: "partyId",
                partyType: "partyType",
            },
            "key2":{
                currency: "USD",
                partyId: "partyId2",
                partyType: "partyType2",
            }
        };

        jest.spyOn(localCache, "get")
            .mockReturnValue(null);

        participantBulkLookUpSpy.mockResolvedValueOnce({
            "key1": "fspId1",
            "key2": "fspId2",
        });

        const cacheSpy = jest.spyOn(localCache, "set");

        // Act
        await accountLookupClient.getBulkAccountLookup(request);

        // Assert
        expect(cacheSpy).toBeCalledWith("fspId1", "partyId", "partyType", "USD");
        expect(cacheSpy).toBeCalledWith("fspId2", "partyId2", "partyType2", "USD");

    });

});
