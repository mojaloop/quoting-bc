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

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import express from "express";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IBulkQuoteRepo, IQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { check } from "express-validator";
import { BaseRoutes } from "./base/base_routes";

export class QuotingAdminExpressRoutes extends BaseRoutes {
    constructor(
        quotesRepo: IQuoteRepo,
        bulkQuoteRepo: IBulkQuoteRepo,
        logger: ILogger
    ) {
        super(logger, quotesRepo, bulkQuoteRepo);
        this.logger.createChild(this.constructor.name);

        this.mainRouter.get("/quotes", this.getAllQuotes.bind(this));

        this.mainRouter.get("/bulk-quotes", this.getAllBulkQuotes.bind(this));

        this.mainRouter.get(
            "/quotes/:id",
            [
                check("id")
                    .isString()
                    .notEmpty()
                    .withMessage("id must be a non empty string"),
            ],
            this.getQuoteById.bind(this)
        );

        this.mainRouter.get(
            "/bulk-quotes/:id",
            [
                check("id")
                    .isString()
                    .notEmpty()
                    .withMessage("id must be a non empty string"),
            ],
            this.getBulkQuoteById.bind(this)
        );
    }

    private async getAllQuotes(
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) {
        const transactionId = _req.query.transactionId as string;
        const quoteId = _req.query.quoteId as string;
        const amountType = _req.query.amountType as string;
        const transactionType = _req.query.transactionType as string;

        try {
            let fetched;

            if (quoteId || transactionId || amountType || transactionType) {
                this.logger.info("Filtering quotes");
                fetched = await this.quoteRepo.searchQuotes(
                    transactionId,
                    quoteId,
                    amountType,
                    transactionType
                );
            } else {
                this.logger.info("Fetching all quotes");
                fetched = await this.quoteRepo.getQuotes();
            }

            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }

    private async getAllBulkQuotes(
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) {
        this.logger.info("Fetching all bulk quotes");
        try {
            const fetched = await this.bulkQuoteRepo.getBulkQuotes();
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }

    private async getQuoteById(
        req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) {
        if (!this.validateRequest(req, res)) {
            return;
        }

        const id = req.params["id"] ?? null;
        this.logger.info(`Fetching Oracle [${id}].`);

        this.logger.info("Fetching quote by id " + id);

        try {
            const fetched = await this.quoteRepo.getQuoteById(id);
            if (!fetched) {
                res.status(404).json({
                    status: "error",
                    msg: "Quote not found",
                });

                return;
            }
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }

    private async getBulkQuoteById(
        req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) {
        if (!this.validateRequest(req, res)) {
            return;
        }

        const id = req.params["id"] ?? null;
        this.logger.info(`Fetching Oracle [${id}].`);

        this.logger.info("Fetching bulk quote by id " + id);

        try {
            const fetched = await this.bulkQuoteRepo.getBulkQuoteById(id);
            if (!fetched) {
                res.status(404).json({
                    status: "error",
                    msg: "Bulk Quote not found",
                });

                return;
            }
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }
}
