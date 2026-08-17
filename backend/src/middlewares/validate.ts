import { RequestHandler } from "express";
import { ZodTypeAny, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

type Source = "body" | "query" | "params";

/**
 * Zod validation middleware.
 * Validates the chosen request part and replaces it with the parsed value,
 * so downstream handlers always see clean, typed data.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body"): RequestHandler =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      (req as unknown as Record<string, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.join(".") || source,
          message: issue.message,
        }));
        return next(ApiError.unprocessable("Validation failed", errors));
      }
      next(err);
    }
  };
