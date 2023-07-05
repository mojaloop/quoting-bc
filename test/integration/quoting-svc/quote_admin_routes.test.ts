import request from "supertest";
import { MongoClient, Collection } from "mongodb";
import { Service } from "../../../packages/quoting-svc/src/service";
import {
    ConsoleLogger,
    ILogger,
    LogLevel,
} from "@mojaloop/logging-bc-public-types-lib";
import { MongoQuotesRepo, MongoBulkQuotesRepo } from "../../../packages/implementations-lib";
import {
    mockedBulkQuote1,
    mockedQuote1,
    mockedQuote2,
    mockedQuote3,
} from "../../../packages/shared-mocks-lib";


// Logger instances
const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const DB_NAME = process.env.QUOTING_DB_TEST_NAME ?? "quoting";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017";
const COLLECTION_QUOTE = "quotes";
const COLLECTION_BULK_QUOTE = "bulk_quotes";

// Mongo instances
let mongoQuotesRepo: MongoQuotesRepo;
let mongoBulkQuotesRepo: MongoBulkQuotesRepo;
let mongoClient: MongoClient;
let quote: Collection;
let bulkQuote: Collection;

const server = process.env["QUOTING_ADM_URL"] || "http://localhost:3033";


describe("Quote Admin Routes - Integration", () => {
    beforeAll(async () => {
        // Start mongo client and service before conducting all tests
        mongoClient = new MongoClient(CONNECTION_STRING);
        await mongoClient.connect();

        quote = mongoClient.db(DB_NAME).collection(COLLECTION_QUOTE);
        bulkQuote = mongoClient.db(DB_NAME).collection(COLLECTION_BULK_QUOTE);

        mongoQuotesRepo = new MongoQuotesRepo(logger, CONNECTION_STRING, DB_NAME);
        mongoBulkQuotesRepo = new MongoBulkQuotesRepo(logger, CONNECTION_STRING, DB_NAME);
        await mongoQuotesRepo.init();
        await mongoBulkQuotesRepo.init();

        await quote.deleteMany({});
        await bulkQuote.deleteMany({});

        await Service.start();
    });

    afterEach(async () => {
        // Delete all quotes after each test
        await quote.deleteMany({});
        await bulkQuote.deleteMany({});
    });

    afterAll(async () => {
        await quote.deleteMany({});
        await bulkQuote.deleteMany({});

        await mongoQuotesRepo.destroy();
        await mongoBulkQuotesRepo.destroy();

        await mongoClient.close();
        await Service.stop();
    });

    test("GET - should get a quote by its id", async () => {
        // Arrange
        const quoteId = await mongoQuotesRepo.addQuote(mockedQuote1);

        // Act
        const response = await request(server).get(`/quotes/${quoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockedQuote1);
    });

    test("GET - should return error with invlid id for quote", async () => {
        // Arrange
        const quoteId = "invalid-quote-id";

        // Act
        const response = await request(server).get(`/quotes/${quoteId}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should get a list of quotes", async () => {
        // Arrange
        await mongoQuotesRepo.addQuote(mockedQuote1);
        await mongoQuotesRepo.addQuote(mockedQuote2);
        await mongoQuotesRepo.addQuote(mockedQuote3);

        // Act
        const response = await request(server).get("/quotes");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(3);
        expect(response.body[0]).toEqual(mockedQuote1);
        expect(response.body[1]).toEqual(mockedQuote2);
        expect(response.body[2]).toEqual(mockedQuote3);
    });

    test("GET - should get a list of filtered quotes", async () => {
        // Arrange
        await mongoQuotesRepo.addQuote(mockedQuote1);

        // Act
        const response = await request(server)
            .get(`/quotes?transactionId=${mockedQuote1.transactionId}&quoteId=${mockedQuote1.quoteId}
            &amountType=${mockedQuote1.amountType}&transactionType=${mockedQuote1.transactionType.scenario}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0]).toEqual(mockedQuote1);
    });

    test("GET - should get a bulk quote by its id", async () => {
        // Arrange
        const bulkQuoteId = await mongoBulkQuotesRepo.addBulkQuote(mockedBulkQuote1);

        // Act
        const response = await request(server).get(`/bulk-quotes/${bulkQuoteId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockedBulkQuote1);
    });

    test("GET - should return error with invlid id for bulk quote", async () => {
        // Arrange
        const bulkQuoteId = "invalid-bulk-quote-id";

        // Act
        const response = await request(server).get(`/bulk-quotes/${bulkQuoteId}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should get a list of bulk quotes", async () => {
        // Arrange
        await mongoBulkQuotesRepo.addBulkQuote(mockedBulkQuote1);

        // Act
        const response = await request(server).get("/bulk-quotes");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0]).toEqual(mockedBulkQuote1);
    });
});