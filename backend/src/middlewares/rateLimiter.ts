import { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

/** Generic API limiter — protects every endpoint from abuse. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
});

/** Stricter limiter for auth endpoints (login/register/forgot/reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
});

/** Disable rate limiting in tests so suites run fast. */
export const disabledLimiter: RequestHandler = (_req, _res, next) => next();

export const limiter = env.NODE_ENV === "test" ? disabledLimiter : apiLimiter;
export const strictLimiter = env.NODE_ENV === "test" ? disabledLimiter : authLimiter;
