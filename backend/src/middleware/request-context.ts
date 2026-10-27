import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { RequestHandler } from "express";
import type { Logger } from "pino";

export const requestContext = (logger: Logger): RequestHandler => (req, res, next) => {
  // A new server-generated ID prevents callers spoofing or injecting log correlation data.
  const requestId = randomUUID();
  const start = performance.now();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("Cache-Control", "no-store");
  res.on("finish", () => {
    logger.info({
      requestId,
      method: req.method,
      route: req.route?.path ? String(req.baseUrl ?? "") + String(req.route.path) : "[unmatched]", // Route templates only: never log UUIDs, GPS, paths, query data or tokens.
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - start),
    }, "HTTP request");
  });
  next();
};
