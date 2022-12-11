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

 import { ILogger,ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import { MongoOracleFinderRepo, OracleAlreadyRegisteredError } from "@mojaloop/account-lookup-bc-implementations";
 import { NoSuchOracleError, Oracle } from "@mojaloop/account-lookup-bc-domain";
 import { MongoClient, Collection } from "mongodb";
 
 const logger: ILogger = new ConsoleLogger();
 logger.setLogLevel(LogLevel.FATAL);
 
 const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
 const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
 // const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://localhost:27017/";
 const COLLECTION_NAME = "oracles";
 
 let oracleFinder : MongoOracleFinderRepo;
 
 let mongoClient: MongoClient;
 let collection : Collection;
 const connectionString = `${CONNECTION_STRING}/${DB_NAME}`;
 
 describe("Infrastructure - Oracle Finder Integration tests", () => {
 
     beforeAll(async () => {
         mongoClient = await MongoClient.connect(connectionString);
         collection = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);
         oracleFinder = new MongoOracleFinderRepo(logger, CONNECTION_STRING, DB_NAME);
         await oracleFinder.init();
     });
 
     afterEach(async () => {
       await collection.deleteMany({});
     });
 
     afterAll(async () => {
         await oracleFinder.destroy();
         await mongoClient.close();
     });
 
     test("should be able to init the builtin oracle finder", async () => {
         expect(oracleFinder).toBeDefined();
     });
 
 
     test("should return an empty array if there are no oracles in the database", async () => {
         // Act
         const oracles = await oracleFinder.getAllOracles();
         
         // Assert
         expect(oracles).toEqual([]);
     });
 
     test("should throw error when is unable to init oracle finder", async () => {
         // Arrange
         const badOracleFinder = new MongoOracleFinderRepo(logger, "invalid connection", "invalid_db_name");
         
         // Act
         await expect(badOracleFinder.init()).rejects.toThrowError();
 
     });
 
     test("should throw error when is unable to destroy oracle finder", async () => {
         // Arrange
         const badOracleFinder = new MongoOracleFinderRepo(logger, "invalid connection", "invalid_db_name");
 
         // Act
         await expect(badOracleFinder.destroy()).rejects.toThrowError();
     });
 
     test("should insert remote and builtin oracles in the database", async () => {
         // Arrange
         const builtInOracle: Oracle = {
             id: "testOracleId1",
             endpoint: null,
             name: "testName",
             partyType: "testPartyType",
             type: "builtin",
             partySubType: "testPartySubType",
         };
 
         const remoteOracle: Oracle = {
             id: "testOracleId2",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         // Act
         await oracleFinder.addOracle(builtInOracle);
         await oracleFinder.addOracle(remoteOracle);
 
         // Assert
         const oracles = await oracleFinder.getAllOracles();
         expect(oracles[0].id).toEqual(builtInOracle.id);
         expect(oracles[0].name).toEqual(builtInOracle.name);
         expect(oracles[0].type==="builtin").toBeTruthy();
         expect(oracles[1].id).toEqual(remoteOracle.id);
         expect(oracles[1].name).toEqual(remoteOracle.name);
         expect(oracles[1].type==="remote-http").toBeTruthy();
         
     });
 
     test("should return error if oracle is already registered", async () => {
         // Arrange
         const oracle: Oracle = {
             id: "testOracleId1",
             endpoint: null,
             name: "testName",
             partyType: "testPartyType",
             type: "builtin",
             partySubType: "testPartySubType",
         };
 
         await oracleFinder.addOracle(oracle);
 
         // Act && Assert
         await expect(oracleFinder.addOracle(oracle)).rejects.toThrow(OracleAlreadyRegisteredError);
     });
 
     test("should return an oracle by its id", async () => {
         // Arrange
         const oracle: Oracle = {
             id: "testOracleId3",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         // Act
         await oracleFinder.addOracle(oracle);
         const oracleById = await oracleFinder.getOracleById(oracle.id);
 
         // Assert
         expect(oracleById?.id).toEqual(oracle.id);
 
     });
 
     test("should return null if no oracle it's found by its id", async () => {
         // Act
         const oracleById = await oracleFinder.getOracleById("nonExistingOracleId");
 
         // Assert
         expect(oracleById).toBeNull();
     });
 
     test("should return an oracle by its name", async () => {
         //Arrange
         const oracle: Oracle = {
             id: "testOracleId4",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         //Act
         await oracleFinder.addOracle(oracle);
         const oracleFound = await oracleFinder.getOracleByName(oracle.name);
 
         //Assert
         expect(oracleFound?.name).toEqual(oracle.name);
 
     });
 
     test("should return null if there are no oracles with the given name", async () => {
         //Arrange
         const oracle: Oracle = {
             id: "testOracleId7",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         //Act
         await oracleFinder.addOracle(oracle);
         const oracleFound = await oracleFinder.getOracleByName("non existing name");
 
         //Assert
         expect(oracleFound).toEqual(null);
 
     });
 
     test("should return an oracle by its party type and party sub type", async () => {
         //Arrange
         const oracle: Oracle = {
             id: "testOracleId5",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         //Act
         await oracleFinder.addOracle(oracle);
         const oracleFound = await oracleFinder.getOracle(oracle.partyType, oracle.partySubType);
 
         //Assert
         expect(oracleFound?.id).toEqual(oracle.id);
         expect(oracleFound?.partyType).toEqual(oracle.partyType);
         expect(oracleFound?.partySubType).toEqual(oracle.partySubType);
 
     });
 
     test("should throw error if there are no oracles with the given party type and party sub type", async () => {
        
         //Act && Assert
         await expect(oracleFinder.getOracle("nonExistingOracleType","nonExistingOracleSubType")).rejects.toThrow(NoSuchOracleError);
 
     });
 
     test("should be able to delete an oracle by its id", async () => {
         //Arrange
         const oracle: Oracle = {
             id: "testOracleId8",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         //Act
         await oracleFinder.addOracle(oracle);
         await oracleFinder.removeOracle(oracle.id);
         
         //Assert
         const oracles = await oracleFinder.getAllOracles();
         expect(oracles).toEqual([]);
     });
 
     test("should throw error if the oracle to be deleted does not exist", async () => {
         //Arrange
         const oracle: Oracle = {
             id: "testOracleId9",
             endpoint: "testEndpoint",
             name: "testName",
             partyType: "testPartyType",
             type: "remote-http",
             partySubType: "testPartySubType",
         };
 
         //Act && Assert
         await oracleFinder.addOracle(oracle);
         await expect(oracleFinder.removeOracle("nonExistingOracleId")).rejects.toThrow(NoSuchOracleError);
     });
 
     
 });
 
 
 
 