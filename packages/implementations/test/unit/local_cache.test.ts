// /**
//  License
//  --------------
//  Copyright © 2021 Mojaloop Foundation

//  The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

//  You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

//  Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

//  Contributors
//  --------------
//  This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
//  Names of the original copyright holders (individuals or organizations)
//  should be listed with a '' in the first column. People who have
//  contributed from an organization can be listed under the organization
//  that actually holds the copyright for their contributions (see the
//  Gates Foundation organization for an example). Those individuals should have
//  their names indented and be marked with a '-'. Email address can be added
//  optionally within square brackets <email>.

//  * Gates Foundation
//  - Name Surname <name.surname@gatesfoundation.com>

//  * Arg Software
//  - José Antunes <jose.antunes@arg.software>
//  - Rui Rocha <rui.rocha@arg.software>

//  --------------
//  **/

"use strict";

import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { LocalCache } from "../../src/local_cache";

let localCache: LocalCache;

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

describe("Implementations - Local Cache Unit Tests", () => {

    afterAll(async () => {
         jest.clearAllMocks();
    });

    test("should create a new local cache instance", async()=>{

         //Arrange && Act
         localCache = new LocalCache(logger);
         localCache.set(1,"type","key");

         //Assert
         expect(localCache).toBeDefined();
         expect(localCache.get("type:key")).toBe(1);
     });

     test("should return null if time to live for the specific entry is surpassed", async()=>{

         //Arrange
         localCache = new LocalCache(logger,1);
         localCache.set(1,"type","key");
         await new Promise(resolve => setTimeout(resolve, 2000));

         //Act
         const result = localCache.get("type:key");

         //Assert
         expect(result).toBeNull();
     });

     test("should return value if time to live for the specific entry is not surpassed", async()=>{

         //Arrange
         localCache = new LocalCache(logger,10);
         localCache.set(1, "type", "key");
         await new Promise(resolve => setTimeout(resolve, 2000));

         //Act
         const result = localCache.get("type:key");

         //Assert
         expect(result).toBe(1);
     });

     test("should return null if no key is present", async()=>{

         //Arrange
         localCache = new LocalCache(logger);
         localCache.set(1,"type","key");

         //Act
         const result = localCache.get("InvalidKey");

         //Assert
         expect(result).toBeNull();
     });

     test("should throw error when try to set a entry that already exists", async()=>{

         //Arrange
         localCache = new LocalCache(logger);
         localCache.set(1,"key");

         //Act && Assert
         expect(() => localCache.set(1,"key")).toThrowError();

     });

     test("should store null values", async()=>{
        //Arrange
        localCache = new LocalCache(logger);
        localCache.set(null,"key");

        //Act
        const result = localCache.get("key");

        //Assert
        expect(result).toBeNull();
    });



    test("should clear cache", async()=>{

        //Arrange
        localCache = new LocalCache(logger);
        localCache.set(1, "key");
        localCache.destroy();

        //Act
        const result = localCache.get("key");

        //Assert
        expect(result).toBeNull();
    });

    test("should accept null key as argument", async()=>{
        //Arrange
        localCache = new LocalCache(logger);

        localCache.set(1, null,"key");

        //Act
        const result = localCache.get("key");

        //Assert
        expect(result).toBe(1);

    });

});

