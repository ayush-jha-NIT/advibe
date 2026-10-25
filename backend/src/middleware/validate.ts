import type { RequestHandler } from "express";
import type { z } from "zod";
import { HttpError } from "../lib/http-error.js";

export function validateBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new HttpError(
        422,
        "VALIDATION_ERROR",
        "Invalid request body",
        result.error.issues.slice(0, 20).map(issue => ({
          field: issue.path.join(".") || "body",
          message: issue.message.slice(0, 400),
        })),
      ));
    }
    req.body = result.data;
    next();
  };
}
