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
import { createKycRouter, type KycDependencies } from "./modules/kyc/routes.js";
import { createDeviceRouter } from "./modules/devices/routes.js";
import { createGeoRouter } from "./modules/geo/routes.js";
import { createCreativeRouter, type CreativeDependencies } from "./modules/creatives/routes.js";
import { createPricingAdminRouter } from "./modules/pricing/admin.js";
import { createDiscountRouter } from "./modules/pricing/discounts.js";
import { createQuoteRouter } from "./modules/pricing/quotes.js";
import { createCampaignRouter } from "./modules/campaigns/routes.js";
import { createReservationRouter } from "./modules/reservations/routes.js";

/** Every live API server supplies a database probe; omitted probes fail closed. */
export function createApp(
  config: AppConfig, logger: Logger, checkDatabase?: () => Promise<void>, auth?: AuthDependencies,
  verifyCaptcha?: CaptchaVerifier, kyc?: KycDependencies, creative?: CreativeDependencies,
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
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "Idempotency-Key", "X-Request-ID", "X-Device-ID", "X-Device-Timestamp", "X-Device-Nonce", "X-Device-Signature"],
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
    app.use("/api/v1", createKycRouter(config, auth, kyc));
    app.use("/api/v1", createDeviceRouter(config, auth));
    app.use("/api/v1", createGeoRouter(config, auth));
    app.use("/api/v1", createCreativeRouter(config, auth, creative));
    app.use("/api/v1", createPricingAdminRouter(config, auth));
    app.use("/api/v1", createDiscountRouter(config, auth));
    app.use("/api/v1", createQuoteRouter(config, auth));
    app.use("/api/v1", createCampaignRouter(config, auth));
    app.use("/api/v1", createReservationRouter(config, auth));
    app.use("/api/v1", createAccountsRouter(config, auth,
      verifyCaptcha ?? createTurnstileVerifier()));
  }
  // B14-B23 add confirmed bookings, payments and playback; frontend demo remains isolated.
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
