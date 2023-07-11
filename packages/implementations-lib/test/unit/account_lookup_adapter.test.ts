import { MemoryAuthenticatedHttpRequesterMock } from '@mojaloop/quoting-bc-shared-mocks-lib';
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
import { IAccountLookupService } from "@mojaloop/quoting-bc-domain-lib";
import { AccountLookupAdapter } from '../../src/external_adapters/account_lookup_adapter';
import { IAuthenticatedHttpRequester } from '@mojaloop/security-bc-client-lib';
import { GetAccountLookupAdapterError } from '../../src/errors';

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
let authenticatedRequester : IAuthenticatedHttpRequester;

describe("Account Lookup Adapter - Unit Tests", () => {
    beforeAll(async () => {
         const logger: ILogger = new ConsoleLogger();
         logger.setLogLevel(LogLevel.FATAL);
         authenticatedRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "token");
         accountLookupClient = new AccountLookupAdapter(
            logger,
            BASE_URL_ACCOUNT_LOOKUP_CLIENT,
            authenticatedRequester,
            20000,
         );
     });

    afterEach(() => {
        jest.restoreAllMocks();
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

    test("getAccountLookup - should throw error if couldnt get fspId by partyId, partyType and currency", async () => {
        // Arrange
        participantLookUpSpy.mockRejectedValueOnce(new Error("error"));

        // Act && Assert
        await expect(accountLookupClient.getAccountLookup("MSISDN", "partyType", "currency")).rejects.toThrow(GetAccountLookupAdapterError);

    });

});
