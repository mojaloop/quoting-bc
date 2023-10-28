import { IBulkQuoteRepo, IQuoteRepo } from "@mojaloop/quoting-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import express from "express";
import { validationResult } from "express-validator";
import { CallSecurityContext, ForbiddenError, IAuthorizationClient, ITokenHelper, UnauthorizedError } from "@mojaloop/security-bc-public-types-lib";

declare module "express-serve-static-core" {
    export interface Request {
        securityContext: null | CallSecurityContext;
    }
}

export abstract class BaseRoutes {


    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
    private readonly _quoteRepo: IQuoteRepo;
    private readonly _bulkQuoteRepo: IBulkQuoteRepo;
    private readonly _authorizationClient: IAuthorizationClient;
    private readonly _tokenHelper: ITokenHelper;

    constructor(logger: ILogger, quoteRepo: IQuoteRepo, bulkQuoteRepo: IBulkQuoteRepo, tokenHelper: ITokenHelper, authorizationClient: IAuthorizationClient) {
        this._mainRouter = express.Router();
        this._logger = logger;
        this._quoteRepo = quoteRepo;
        this._bulkQuoteRepo = bulkQuoteRepo;
        this._authorizationClient = authorizationClient;
        this._tokenHelper = tokenHelper;

        // inject authentication - all requests require a valid token
        this._mainRouter.use(this._authenticationMiddleware.bind(this));
    }

    public get logger(): ILogger {
        return this._logger;
    }

    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    get quoteRepo(): IQuoteRepo {
        return this._quoteRepo;
    }

    get bulkQuoteRepo(): IBulkQuoteRepo {
        return this._bulkQuoteRepo;
    }

    private async _authenticationMiddleware(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const authorizationHeader = req.headers["authorization"];

        if (!authorizationHeader) return res.sendStatus(401);

        const bearer = authorizationHeader.trim().split(" ");
        if (bearer.length != 2) {
            return res.sendStatus(401);
        }

        const bearerToken = bearer[1];
        const callSecCtx:  CallSecurityContext | null = await this._tokenHelper.getCallSecurityContextFromAccessToken(bearerToken);

        if(!callSecCtx){
            return res.sendStatus(401);
        }

        req.securityContext = callSecCtx;
        return next();
    }

    protected _validateRequest(req: express.Request, res: express.Response) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }

    protected _handleUnauthorizedError(err: Error, res: express.Response): boolean {
        if (err instanceof UnauthorizedError) {
            this._logger.warn(err.message);
            res.status(401).json({
                status: "error",
                msg: err.message,
            });
            return true;
        } else if (err instanceof ForbiddenError) {
            this._logger.warn(err.message);
            res.status(403).json({
                status: "error",
                msg: err.message,
            });
            return true;
        }

        return false;
    }
    
    protected _enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
        for (const roleId of secCtx.platformRoleIds) {
            if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
                return;
            }
        }
        const error = new ForbiddenError("Caller is missing platform role with privilegeId: " + privilegeId);
        this._logger.isWarnEnabled() && this._logger.warn(error.message);
        throw error;
    }

}