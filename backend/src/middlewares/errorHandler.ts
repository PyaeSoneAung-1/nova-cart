import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { errorBody } from "../utils/serialize";
import { env } from "../config/env";
import { HttpStatus } from "../types";

/** 404 handler for unknown routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Translates known Prisma errors into friendly API errors. */
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (err.code) {
    case "P2002":
      return ApiError.conflict("A record with this value already exists", [
        { target: err.meta?.target, message: "Unique constraint violation" },
      ]);
    case "P2003":
      return ApiError.badRequest("Referenced record does not exist", [
        { target: err.meta?.field_name, message: "Foreign key constraint violation" },
      ]);
    case "P2025":
      return ApiError.notFound("Record not found");
    case "P2014":
      return ApiError.badRequest("Invalid relation change");
    case "P2000":
      return ApiError.badRequest("Value is too long for the column");
    default:
      return new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Database operation failed",
      );
  }
}

/** Centralized error handler — the single place where errors become responses. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(errorBody(err.message, err.errors));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    return res.status(mapped.statusCode).json(errorBody(mapped.message, mapped.errors));
  }

  // Prisma validation errors (malformed data, wrong types)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json(errorBody("Invalid data provided to the database"));
  }

  // JSON body parse errors
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json(errorBody("Invalid JSON payload"));
  }

  // Anything else — never leak stack traces in production.
  // eslint-disable-next-line no-console
  console.error("💥 Unhandled error:", err);
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
    errorBody(
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Internal server error",
    ),
  );
}
