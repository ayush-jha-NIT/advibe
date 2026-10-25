import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import type { AppConfig } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";

export function createApp(config: AppConfig, logger: Logger): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  // Readiness is an API-process check only: database, payments and devices do not exist in B1.
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

  // Matches the B0 OpenAPI health response schema.
  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ data: { message: "ok" } });
  });
  app.get("/api/v1/ready", (_req, res) => {
    if (!app.locals.ready) {
      throw new HttpError(503, "NOT_READY", "API is not accepting traffic");
    }
    res.status(200).json({ data: { message: "ready" } });
  });

  // B2–B23 add modules above the terminal 404; never expose demo routes.
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
