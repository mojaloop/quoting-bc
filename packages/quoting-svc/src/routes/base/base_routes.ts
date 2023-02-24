import { QuotingAggregate } from "@mojaloop/quoting-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import express from "express";
import { validationResult } from "express-validator";

export abstract class BaseRoutes {

    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
    private readonly _quotingAggregate: QuotingAggregate;

    constructor(logger: ILogger, quotingAggregate: QuotingAggregate) {
        this._mainRouter = express.Router();
        this._logger = logger;
        this._quotingAggregate = quotingAggregate;
    }

    public get logger(): ILogger {
        return this._logger;
    }

    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    get quotingAggregate(): QuotingAggregate {
        return this._quotingAggregate;
    }

    public validateRequest(req: express.Request, res: express.Response) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }
}