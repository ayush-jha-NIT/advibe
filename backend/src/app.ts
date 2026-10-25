import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import type { AppConfig } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import { createAuthRouter, type AuthDependencies } from "./modules/auth/routes.js";
import { createAccountsRouter } from "./modules/accounts/routes.js";
import { createTurnstileVerifier, type CaptchaVerifier } from "./modules/enquiries/captcha.js";
import { createDriverRouter } from "./modules/drivers/routes.js";

/** Every live API server supplies a database probe; omitted probes fail closed. */
export function createApp(
  config: AppConfig, logger: Logger, checkDatabase?: () => Promise<void>, auth?: AuthDependencies,
  verifyCaptcha?: CaptchaVerifier,
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.locals.ready = true;
  app.use(requestContext(logger));
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new HttpError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed"));
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "Idempotency-Key", "X-Request-ID"],
    maxAge: 600,
  }));
  app.use(express.json({ limit: "64kb", strict: true }));
  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ data: { message: "ok" } });
  });
  app.get("/api/v1/ready", async (_req, res) => {
    if (!app.locals.ready || !checkDatabase) {
      throw new HttpError(503, "NOT_READY", "API or database is unavailable");
    }
    try { await checkDatabase(); }
    catch { throw new HttpError(503, "NOT_READY", "API or database is unavailable"); }
    res.status(200).json({ data: { message: "ready" } });
  });
  if (auth) {
    app.use("/api/v1/auth", createAuthRouter(config, auth));
    app.use("/api/v1/drivers", createDriverRouter(config, auth));
    app.use("/api/v1", createAccountsRouter(config, auth,
      verifyCaptcha ?? createTurnstileVerifier()));
  }
  // B7-B23 add private KYC, device, pricing and payment routes; demo remains isolated.
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
