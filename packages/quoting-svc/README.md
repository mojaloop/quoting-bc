# Quoting BC - Quoting Service

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/quoting-bc.svg?style=flat)](https://github.com/mojaloop/quoting-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/quoting-bc.svg?style=flat)](https://github.com/mojaloop/quoting-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop-poc/quoting-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/quoting-bc)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/quoting-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/quoting-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/quoting-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/quoting-bc)

Mojaloop vNext Quoting Service

## Install 

See notes in [Installing and Building](#)

More information on how to install NVM: https://github.com/nvm-sh/nvm

## Build

```bash
npm run build
```

## Run this service

Anywhere in the repo structure:

```bash
npm run packages/quoting-svc start
```

## Auto build (watch)

```bash
npm run watch
```

## Unit Tests

```bash
npm run test:unit
```

## Integration Tests

```bash
npm run test:integration
```

## Configuration 

### Environment variables

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| PRODUCTION_MODE      | Flag indicating production mode   | FALSE                  |
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG        |
| AUTH_N_SVC_BASEURL | Authentication service base URL  |http://localhost:3201|
| AUTH_N_TOKEN_ISSUER_NAME    | Authentication service token issuer name           |   mojaloop.vnext.dev.default_issuer    |
| AUTH_N_TOKEN_AUDIENCE        | Authentication service token audience    |    mojaloop.vnext.dev.default_audience   |
| AUTH_N_SVC_JWKS_URL  | Authentication service base URL    | `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`        |
| AUTH_Z_SVC_BASEURL   | Authorization service base URL    | http://authorization-svc:3202           |
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| MONGO_URL            | MongoDB connection URL             | mongodb://root:mongoDbPas42@localhost:27017/ |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| KAFKA_AUDITS_TOPIC        | Kafka topic for audits              | audits                 |
| AUDIT_KEY_FILE_PATH  | File path for audit key           | /app/data/audit_private_key.pem         |
| SVC_CLIENT_ID        | Service client ID                 | settlements-bc-api-svc                 |
| SVC_CLIENT_SECRET    | Service client secret             | superServiceSecret     |
| SVC_DEFAULT_HTTP_PORT                 | Default HTTP port for the service                  | 3600  |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |
| SVC_HTTP_PORT        | HTTP port for the service         |    3600   |
| PARTICIPANTS_SVC_URL | Participant service URL     | http://localhost:3010|
| PASS_THROUGH_MODE | pass through mode | true |