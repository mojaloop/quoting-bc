# quoting-bc
**EXPERIMENTAL** vNext Quoting (Agreements) Bounded Context

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/quoting-bc.svg?style=flat)](https://github.com/mojaloop/quoting-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/quoting-bc.svg?style=flat)](https://github.com/mojaloop/quoting-bc/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/quoting-bc.svg?style=flat)](https://hub.docker.com/r/mojaloop/quoting-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/quoting-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/quoting-bc)

The Quoting and Agreements Bounded Context provides Participants with quotations for undertaking transfers, and records the participant accept/reject responses.

## Contents
- [quoting-bc](#quoting-bc)
  - [Contents](#contents)
  - [Packages](#packages)
  - [Running Locally](#running-locally)
  - [Configuration](#configuration)
  - [API](#api)
  - [Logging](#logging)
  - [Tests](#tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [Container Scans](#container-scans)
  - [Automated Releases](#automated-releases)
    - [Potential problems](#potential-problems)
  - [Documentation](#documentation)

## Packages
The Quoting BC consists of the following packages;

`domain-lib`
Domain library types.
[README](./packages/domain-lib/README.md)

`implementation-lib`
Account Lookup Infrastructure Library.
[README](packages/implementation-lib/README.md)

`quoting-svc`
HTTP service for Quoting BC.
[README](packages/quoting-svc/README.md)

`shared-mocks-lib`
Mock implementation used for testing.
[README](./packages/shared-mocks-lib/README.md)

## Running Locally

Please follow the instruction in [Onboarding Document](Onboarding.md) to setup and run the service locally.

## Configuration

See the README.md file on each services for more Environment Variable Configuration options.

## API

For endpoint documentation, see the [API documentation](https://github.com/mojaloop/mojaloop-specification/blob/master/admin-api/admin-api-specification-v1.0.md#api-resource-settlementmodels).


## Logging

Logs are sent to standard output by default.

## Tests

### Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```shell
npm run test:integration
```

### Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```

### Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests:

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

## Auditing Dependencies
We use npm audit to check dependencies for node vulnerabilities. 

To start a new resolution process, run:
```
npm run audit:fix
```
You can then check to see if the CI will pass based on the current dependencies with:

```
npm run audit:check
```

## Container Scans

### Execute locally the pre-commit checks - these will be executed with every commit and in the default CI/CD pipeline 

Make sure these pass before committing any code
```
npm run pre_commit_check
```


As part of our CI/CD process, we use anchore-cli to scan our built docker container for vulnerabilities upon release.
If you find your release builds are failing, refer to the [container scanning](https://github.com/mojaloop/ci-config#container-scanning) in our shared Mojaloop CI config repo. There is a good chance you simply need to update the `mojaloop-policy-generator.js` file and re-run the circleci workflow.

For more information on anchore and anchore-cli, refer to:
    - [Anchore CLI](https://github.com/anchore/anchore-cli)
    - [Circle Orb Registry](https://circleci.com/orbs/registry/orb/anchore/anchore-engine)

## Automated Releases

As part of our CI/CD process, we use a combination of CircleCI, standard-version
npm package and github-release CircleCI orb to automatically trigger our releases
and image builds. This process essentially mimics a manual tag and release.

On a merge to main, CircleCI is configured to use the mojaloopci github account
to push the latest generated CHANGELOG and package version number.

Once those changes are pushed, CircleCI will pull the updated main, tag and
push a release triggering another subsequent build that also publishes a docker image.

## Documentation
The following documentation provides insight into the Settlements Bounded Context.

- **Reference Architecture** - https://mojaloop.github.io/reference-architecture-doc/boundedContexts/quotingAgreement/
- **Work Sessions** - https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4