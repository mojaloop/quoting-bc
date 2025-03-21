/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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
 import { IBulkQuoteRepo, IQuoteRepo, QuotingPrivileges } from "@mojaloop/quoting-bc-domain-lib";
 import { check } from "express-validator";
 import { BaseRoutes } from "./base/base_routes";
 import { IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";

 export class QuotingAdminExpressRoutes extends BaseRoutes {
     constructor(
         quotesRepo: IQuoteRepo,
         bulkQuoteRepo: IBulkQuoteRepo,
         logger: ILogger,
         tokenHelper: ITokenHelper,
         authorizationClient: IAuthorizationClient
     ) {
         super(logger, quotesRepo, bulkQuoteRepo, tokenHelper, authorizationClient);
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

         this.mainRouter.get("/searchKeywords/", this._getSearchKeywords.bind(this));
     }

     private async getAllQuotes(req: express.Request, res: express.Response) {
         try {
             this._enforcePrivilege(req.securityContext!, QuotingPrivileges.VIEW_ALL_QUOTES);

             const amountType = req.query.amountType as string || null;
             const transactionType = req.query.transactionType as string || null;
             const quoteId = req.query.quoteId as string || null;
             const bulkQuoteId = req.query.bulkQuoteId as string || null;
             const transactionId = req.query.transactionId as string || null;
             const payerId = req.query.payerId as string || req.query.payerid as string;
             const payeeId = req.query.payeeId as string || req.query.payeeid as string;
             const status = req.query.status as string || null;

             // optional pagination
             const pageIndexStr = req.query.pageIndex as string || req.query.pageindex as string;
             const pageIndex = pageIndexStr ? parseInt(pageIndexStr) : undefined;

             const pageSizeStr = req.query.pageSize as string || req.query.pagesize as string;
             const pageSize = pageSizeStr ? parseInt(pageSizeStr) : undefined;


             this.logger.debug("Fetching all quotes");

             const fetched = await this.quoteRepo.searchQuotes(
                 amountType,
                 transactionType,
                 quoteId,
                 transactionId,
                 bulkQuoteId,
                 payerId,
                 payeeId,
                 status,
                 pageIndex,
                 pageSize
             );

             res.send(fetched);
         } catch (err: unknown) {
             if (this._handleUnauthorizedError((err as Error), res)) return;

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: (err as Error).message,
             });
         }
     }

     private async getAllBulkQuotes(req: express.Request, res: express.Response) {
         this.logger.info("Fetching all bulk quotes");
         try {
             this._enforcePrivilege(req.securityContext!, QuotingPrivileges.VIEW_ALL_QUOTES);

             const fetched = await this.bulkQuoteRepo.getBulkQuotes();
             res.send(fetched);
         } catch (err: unknown) {
             if (this._handleUnauthorizedError((err as Error), res)) return;

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: (err as Error).message,
             });
         }
     }

     private async getQuoteById(req: express.Request, res: express.Response) {
         if (!this._validateRequest(req, res)) {
             return;
         }

         const id = req.params["id"] ?? null;

         this.logger.info("Fetching quote by id " + id);

         try {
             this._enforcePrivilege(req.securityContext!, QuotingPrivileges.VIEW_ALL_QUOTES);

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
             if (this._handleUnauthorizedError((err as Error), res)) return;

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: (err as Error).message,
             });
         }
     }

     private async getBulkQuoteById(req: express.Request, res: express.Response) {
         if (!this._validateRequest(req, res)) {
             return;
         }

         const id = req.params["id"] ?? null;

         this.logger.info("Fetching bulk quote by id " + id);

         try {
             this._enforcePrivilege(req.securityContext!, QuotingPrivileges.VIEW_ALL_QUOTES);

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
             if (this._handleUnauthorizedError((err as Error), res)) return;

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: (err as Error).message,
             });
         }
     }

     private async _getSearchKeywords(req: express.Request, res: express.Response){
         try{
             this._enforcePrivilege(req.securityContext!, QuotingPrivileges.VIEW_ALL_QUOTES);

             const ret = await this.quoteRepo.getSearchKeywords();
             res.send(ret);
         } catch (err: any) {
             if (this._handleUnauthorizedError((err as Error), res)) return;

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: (err as Error).message,
             });
         }
     }

 }
