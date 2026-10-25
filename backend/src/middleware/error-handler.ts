import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "pino";
import { HttpError } from "../lib/http-error.js";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", "API route not found"));
};

export const errorHandler = (logger: Logger): ErrorRequestHandler =>
  (error: unknown, _req, res, next) => {
    if (res.headersSent) return next(error);

    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected server error occurred";
    let details: HttpError["details"];

    if (error instanceof HttpError) {
      status = error.status;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof SyntaxError && "body" in error) {
      status = 400;
      code = "INVALID_JSON";
      message = "Request body must contain valid JSON";
    } else if (
      typeof error === "object" && error !== null &&
      "status" in error && error.status === 413
    ) {
      status = 413;
      code = "PAYLOAD_TOO_LARGE";
      message = "Request body exceeds the allowed size";
    }

    const requestId: string = typeof res.locals.requestId === "string"
      ? res.locals.requestId
      : "unavailable";
    const log = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log({ requestId, status, code }, "API request rejected");

    res.status(status).json({
      error: {
        code,
        message,
        requestId,
        ...(details?.length ? { details } : {}),
      },
    });
  };
