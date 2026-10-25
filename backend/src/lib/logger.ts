import pino, { type Logger } from "pino";
import type { AppConfig } from "../config/env.js";

export function createLogger(config: Pick<AppConfig, "logLevel">): Logger {
  return pino({
    level: config.logLevel,
    base: { service: "advibe-api" },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "password",
        "otp",
        "token",
        "secret",
        "authorization",
        "cookie",
        "bankAccount",
      ],
      censor: "[REDACTED]",
    },
  });
}
