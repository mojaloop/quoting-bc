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

import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import request from "supertest";
import { QuotingAdminExpressRoutes } from "../../src/routes/quote_admin_routes";
import { IQuoteRepo, IBulkQuoteRepo  } from "@mojaloop/quoting-bc-domain-lib";
import { MemoryAuthorizationClient,  MemoryTokenHelper, MemoryQuoteRepo, MemoryBulkQuoteRepo, mockedQuote1, mockedBulkQuote1  } from "@mojaloop/quoting-bc-shared-mocks-lib";
import { CallSecurityContext, IAuthorizationClient, ITokenHelper, UnauthorizedError } from "@mojaloop/security-bc-public-types-lib";
import express, {Express} from "express";
import { Server } from "http";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const server = process.env["QUOTING_ADM_URL"] || "http://localhost:3500";

const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3500;

let quotingAdminRoutes : QuotingAdminExpressRoutes;

const mockedQuoteRepository: IQuoteRepo = new MemoryQuoteRepo(logger);

const mockedBulkQuoteRepository: IBulkQuoteRepo = new MemoryBulkQuoteRepo(logger);

const mockedTokenHelper: ITokenHelper = new MemoryTokenHelper(logger);

const mockedAuthorizationClient: IAuthorizationClient = new MemoryAuthorizationClient(logger);

const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImh1Yl9vcGVyYXRvciJdLCJpYXQiOjE2OTgwMjEwNTksImV4cCI6MTY5ODYyNTg1OSwiYXVkIjoibW9qYWxvb3Audm5leHQuZGV2LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9pc3N1ZXIiLCJzdWIiOiJ1c2VyOjp1c2VyIiwianRpIjoiYzFkNjdkMTEtYzExNS00MTU0LTlmZDEtZThlNDI5M2E3YjFkIn0.QK6QVblcaKldvdbCH6sWSa7kqrOjJ1urWcp6dyMWo0Ln7Faq29bPE4t4Mcd-WQVhO3a1sE-YhBrcpUNI0YCbbS5rRdI1SRqnCMWv3g9vyDKEnIFFu_6LM7K1Ct_JGpT4fP4KMVnT03mMeobIESbVu8Ep1zSfLWv2TAB4EzZUlh-HeJMDaUj8ESM91PdXmCHieM1br3JLwuy2WSxMJSbjYrH1G68TW38U4CPBTyhRwiwlB8Ro5MTjHqdH8EQC7A_E4iwwe-GkuoP63qOSPA0ZZ0O7Ry-dRhyips_S3cSjGWAgwXDyylh5Q4OjAtTpD1di1bm2uj1lXXkFC3cDQiV94Q";

const securityContext:CallSecurityContext = {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTY5ODE1NDUzNSwiZXhwIjoxNjk4NzU5MzM1LCJhdWQiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9hdWRpZW5jZSIsImlzcyI6Im1vamFsb29wLnZuZXh0LmRldi5kZWZhdWx0X2lzc3VlciIsInN1YiI6InVzZXI6OmFkbWluIiwianRpIjoiZTg1MGY1NmItMDM2Yi00YTE0LWI5ZjUtNWUyZWM1NzFlMjdmIn0.kkdTEy1ISNu_nwHRpwg0iaK1aWPfMChZF1Lpbkne5LackYGXCnjnIY5Xt2fY0pJK2awEbduxPM7RWLKoZcKbw_9Vq63OupFqqr8s69q3EjLMZLSeGMTVVNWWEKKm16NM1LSD_z7Em7RcgeQFMcEtU2tOZvFpnvZpXk_-r-mL7AuYAy2ZVI05F0SMczInVAg_3s13yPs_oEPa-zeY9q-nU0d-pvNm7f0USZpZYULjcTmUkdNiM_rZsjdJxI4vrTmumTdts5JV7Qirt4Jk-kf-sFKRpnwQ_ORosBrQiW_B8usqqQb3qWkS4wXOgxnUMqoTneJzXHy_2L4AeDcrS_r6Dw",
    "clientId": "1",
    "platformRoleIds": ["2"],
    "username": "admin"
}

describe("Quoting Admin Routes - Unit tests", () => {
    let app: Express;
    let expressServer: Server;

    beforeAll(async () => {
        app = express();
        app.use(express.json()); // for parsing application/json
        app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

        quotingAdminRoutes = new QuotingAdminExpressRoutes(mockedQuoteRepository, mockedBulkQuoteRepository, logger, mockedTokenHelper, mockedAuthorizationClient)

        app.use("/", quotingAdminRoutes.mainRouter);

        let portNum = SVC_DEFAULT_HTTP_PORT;
        if (process.env["SVC_HTTP_PORT"] && !isNaN(parseInt(process.env["SVC_HTTP_PORT"]))) {
            portNum = parseInt(process.env["SVC_HTTP_PORT"]);
        }

        await new Promise((resolve) => {
            expressServer = app.listen(portNum, () => {
                resolve(true);
            });
        });

    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        await new Promise((resolve) => {
            expressServer.close(() => {
                resolve(true);
            });
        });
    });

    //#region Base router
    test("GET - should return 401 due to missing Authorization header", async () => {
        // Arrange 
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`);

        // Assert
        expect(response.status).toBe(401);
    });
    
    test("GET - should return 401 due to invalid Authorization header bearer", async () => {
        // Arrange 
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `invalidbearertoken`);

        // Assert
        expect(response.status).toBe(401);
    });

    test("GET - should throw general error with request to get a quote by its id", async () => {
        // Arrange 
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        jest.spyOn(mockedAuthorizationClient, "roleHasPrivilege")
            .mockImplementationOnce(() => { throw new Error(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(500);
    });

    test("GET - should throw Unauthorized error with request to get a quote by its id", async () => {
        // Arrange
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockImplementationOnce(() => { throw new UnauthorizedError(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(401);
    });

    test("GET - should throw ForbiddenError error with request to get a quote by its id", async () => {
        // Arrange
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";


        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        jest.spyOn(mockedAuthorizationClient, "roleHasPrivilege")
            .mockReturnValue(false);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(403);
    });

    test("GET - should throw Unauthorized error with request to get a quote by its id", async () => {
        // Arrange
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockImplementationOnce(() => { throw new UnauthorizedError(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);
            
        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(401);
    });

    test("GET - should give UnauthorizedError", async () => {
        // Arrange
        const quoteId = "existing-id";
        const fetchedquote = mockedQuote1;
    
        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockResolvedValueOnce(fetchedquote);
    
            
        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(401);
    });
    //#endregion

    test("GET - should return all quotes", async () => {
        // Arrange
        const searchResult = {
            pageSize: 0,
            totalPages: 0,
            pageIndex: 0,
            items: [mockedQuote1],
        }

        jest.spyOn(mockedQuoteRepository, "searchQuotes")
            .mockResolvedValueOnce(searchResult);

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(searchResult);
    });

    test("GET - should return fetched quote", async () => {
        // Arrange
        const quoteId = "existing-id";
        const fetchedQuote = mockedQuote1;
    
        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockResolvedValueOnce(fetchedQuote);
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(fetchedQuote);
    });

    test("GET - should return 404 when quote is not found", async () => {
        // Arrange
        const quoteId = "nonexistent-id";
    
        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockResolvedValueOnce(null);

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);
    
        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            status: "error",
            msg: "Quote not found",
        });
    });

    test("GET - should throw general error with request to get a quote by its id", async () => {
        // Arrange 
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockImplementationOnce(() => { throw new Error(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(500);
    });

    test("GET - should throw Unauthorized error with request to get a quote by its id", async () => {
        // Arrange
        const quoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";

        jest.spyOn(mockedQuoteRepository, "getQuoteById")
            .mockImplementationOnce(() => { throw new UnauthorizedError(); })

        // Act
        const response = await request(server)
            .get(`/quotes/${quoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(401);
    });

    test("GET - should throw general error with request to get all quotes", async () => {
        // Arrange
        jest.spyOn(mockedQuoteRepository, "searchQuotes")
            .mockImplementationOnce(() => { throw new Error(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(500);
    });

    test("GET - should return fetched bulk quote", async () => {
        // Arrange
        const bulkQuoteId = "existing-id";
        const fetchedBulkQuote = mockedBulkQuote1;
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuoteById")
            .mockResolvedValueOnce(fetchedBulkQuote);
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/bulk-quotes/${bulkQuoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(fetchedBulkQuote);
    });

    test("GET - should return 404 when bulk quote is not found", async () => {
        // Arrange
        const bulkQuoteId = "nonexistent-id";
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuoteById")
            .mockResolvedValueOnce(null);

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);
    
        // Act
        const response = await request(server)
            .get(`/bulk-quotes/${bulkQuoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            status: "error",
            msg: "Bulk Quote not found",
        });
    });
    
    test("GET - should throw general error with request to get all quotes", async () => {
        // Arrange
        jest.spyOn(mockedQuoteRepository, "searchQuotes")
            .mockImplementationOnce(() => { throw new Error(); })

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/quotes`)
            .set(`Authorization`, `Bearer ${accessToken}`);

        // Assert
        expect(response.status).toBe(500);
    });

    test("GET - should throw general error with request to get a bulk quote by its id", async () => {
        // Arrange 
        const bulkQuoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuoteById")
            .mockImplementationOnce(() => { throw new Error(); })
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);
    
        // Act
        const response = await request(server)
            .get(`/bulk-quotes/${bulkQuoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(500);
    });
    
    test("GET - should throw Unauthorized error with request to get a bulk quote by its id", async () => {
        // Arrange
        const bulkQuoteId = "0fbee1f3-c58e-9afe-8cdd-7e65eea2fca9";
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuoteById")
            .mockImplementationOnce(() => { throw new UnauthorizedError(); })
    
        // Act
        const response = await request(server)
            .get(`/bulk-quotes/${bulkQuoteId}`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(401);
    });

    test("GET - should return all bulk quotes", async () => {
        // Arrange
        const mockBulkQuotes = [mockedBulkQuote1];
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuotes")
            .mockResolvedValueOnce(mockBulkQuotes);
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/bulk-quotes`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockBulkQuotes);
    });
    
    test("GET - should return 500 when an error occurs during fetching all bulk quotes", async () => {
        // Arrange
        const errorMessage = "Error fetching bulk quotes";
    
        jest.spyOn(mockedBulkQuoteRepository, "getBulkQuotes")
            .mockRejectedValueOnce(new Error(errorMessage));
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/bulk-quotes`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            status: "error",
            msg: errorMessage,
        });
    });

    test("GET - should return search keywords", async () => {
        // Arrange
        const mockSearchKeywords = [{ fieldName: "field1", distinctTerms: ["term1", "term2"] }, { fieldName: "field2", distinctTerms: ["term3", "term4"] }];
    
        jest.spyOn(mockedQuoteRepository, "getSearchKeywords")
            .mockResolvedValueOnce(mockSearchKeywords);

        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/searchKeywords`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockSearchKeywords);
    });
    
    test("GET - should return 500 when an error occurs during fetching search keywords", async () => {
        // Arrange
        const errorMessage = "Error fetching search keywords";
    
        jest.spyOn(mockedQuoteRepository, "getSearchKeywords")
            .mockRejectedValueOnce(new Error(errorMessage));
    
        jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
            .mockResolvedValueOnce(securityContext);

        // Act
        const response = await request(server)
            .get(`/searchKeywords`)
            .set(`Authorization`, `Bearer ${accessToken}`);
    
        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            status: "error",
            msg: errorMessage,
        });
    });
});


