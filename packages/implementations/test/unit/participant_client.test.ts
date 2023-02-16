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

import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import { ParticipantAdapter} from "../../src/external_adapters/participant_adapter";
import { ILocalCache, LocalCache } from "@mojaloop/quoting-bc-implementations";
import { Participant} from "@mojaloop/participant-bc-public-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";


const BASE_URL_PARTICIPANT_CLIENT: string = "http://localhost:1234";

const getParticipantByIdSpy = jest.fn();
const getParticipantsByIdsSpy = jest.fn();

jest.mock("@mojaloop/participants-bc-client-lib", () => {
        return {
            ParticipantsHttpClient: jest.fn().mockImplementation(() => {
                return {
                    getParticipantById: getParticipantByIdSpy,
                    getParticipantsByIds: getParticipantsByIdsSpy
            }
        })
    }
});

let participantAdapter: ParticipantAdapter;
let localCache: ILocalCache;
let authRequester: IAuthenticatedHttpRequester;
let timeoutMs: number = 1000;

describe("Participants Client - Unit Tests", () => {
    beforeAll(async () => {
         const logger: ILogger = new ConsoleLogger();
         logger.setLogLevel(LogLevel.FATAL);
         localCache = new LocalCache(logger);
         participantAdapter = new ParticipantAdapter(
             logger,
             BASE_URL_PARTICIPANT_CLIENT,
             authRequester,
             timeoutMs,
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

     // Get participant.
    test("should receive null if participant doesnt exist", async () => {
        // Arrange
        const participantId: string = "nonExistingParticipantId";
        getParticipantByIdSpy.mockResolvedValueOnce(null);

        // Act
        const participantInfo = await participantAdapter.getParticipantInfo(participantId);

        // Assert
        expect(participantInfo).toBeNull();
    });

    test("should get participant info", async () => {
        // Arrange
        const participantId: string = "existingParticipantId";
        const participant: Partial<Participant> = {
            id: participantId,
            name: "existingParticipantName",
            isActive: true,
            createdBy: "existingParticipantCreatedBy",
            type: "DFSP",
            createdDate: 1232131,
            approved: true,
            approvedBy: "existingParticipantApprovedBy",
            approvedDate: 1232131,
            description: "existingParticipantDescription"
        }
        getParticipantByIdSpy.mockResolvedValueOnce(participant);

         // Act
         const participantInfo =
             await participantAdapter.getParticipantInfo(participantId);

         // Assert
         expect(participantInfo).toEqual(participant);
        });

    test("should throw null if getting an error while getting participant info", async () => {
        // Arrange
        const participantId: string = "existingParticipantId";
        getParticipantByIdSpy.mockRejectedValueOnce(null);

        // Act
        const participantInfo = await participantAdapter.getParticipantInfo(participantId);

        // Assert
        expect(participantInfo).toBeNull();
    });

    test("should get participants info", async () => {
        // Arrange
        const participantId1: string = "existingParticipantId1";
        const participantId2: string = "existingParticipantId2";
        const participant1: Partial<Participant> = {
            id: participantId1,
            name: "existingParticipantName1",
            isActive: true,
            createdBy: "existingParticipantCreatedBy1",
            type: "DFSP",
            createdDate: 1232131,
            approved: true,
            approvedBy: "existingParticipantApprovedBy1",
            approvedDate: 1232131,
            description: "existingParticipantDescription1"
        }
        const participant2: Partial<Participant> = {
            id: participantId2,
            name: "existingParticipantName2",
            isActive: true,
            createdBy: "existingParticipantCreatedBy2",
            type: "DFSP",
            createdDate: 1232131,
            approved: true,
            approvedBy: "existingParticipantApprovedBy2",
            approvedDate: 1232131,
            description: "existingParticipantDescription2"
        }

        getParticipantsByIdsSpy.mockResolvedValueOnce([participant1, participant2]);

        // Act
        const participantsInfo =
            await participantAdapter.getParticipantsInfo([participantId1, participantId2]);

        // Assert
        expect(participantsInfo).toEqual([participant1, participant2]);
    });

    test("should get participants info from cache", async () => {
        // Arrange
        const participantId1: string = "existingParticipantId1";
        const participantId2: string = "existingParticipantId2";
        const participant1: Partial<Participant> = {
            id: participantId1,
            name: "existingParticipantName1",
            isActive: true,
            createdBy: "existingParticipantCreatedBy1",
            type: "DFSP",
            createdDate: 1232131,
            approved: true,
            approvedBy: "existingParticipantApprovedBy1",
            approvedDate: 1232131,
            description: "existingParticipantDescription1"
        }
        const participant2: Partial<Participant> = {
            id: participantId2,
            name: "existingParticipantName2",
            isActive: true,
            createdBy: "existingParticipantCreatedBy2",
            type: "DFSP",
            createdDate: 1232131,
            approved: true,
            approvedBy: "existingParticipantApprovedBy2",
            approvedDate: 1232131,
            description: "existingParticipantDescription2"
        }

        jest.spyOn(localCache, "get")
            .mockReturnValueOnce(participant1)
            .mockReturnValueOnce(participant2);

        // Act
        const participantsInfo =
            await participantAdapter.getParticipantsInfo([participantId1, participantId2]);

        // Assert
        expect(participantsInfo).toEqual([participant1, participant2]);
    });

    test("should retrieve participant from cache", async () => {
         // Arrange
        const participantId: string = "existingParticipantId";
        jest.spyOn(localCache, "get").mockReturnValue({"id":1, "name":"cache"});

         // Act
        const participantInfo = await participantAdapter.getParticipantInfo(participantId);

         // Assert
         expect(participantInfo).toEqual({"id":1, "name":"cache"});
    });

});
