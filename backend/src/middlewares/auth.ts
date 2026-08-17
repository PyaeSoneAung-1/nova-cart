import { RequestHandler } from "express";
import { verifyAccessToken } from "../utils/token";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/prisma";
import { Role } from "../types";

/**
 * Authenticate middleware — verifies the Bearer access token
 * and loads the user. Attaches { id, role } to req.user.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Authentication required. Provide a Bearer token.");
    }

    const token = header.slice(7).trim();
    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw ApiError.unauthorized("Invalid token type.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) throw ApiError.unauthorized("Account no longer exists.");
    if (!user.isActive) throw ApiError.forbidden("Account has been deactivated.");

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized("Invalid or expired token."));
  }
};

/** Authorization middleware — restricts a route to specific roles. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required."));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action."));
    }
    next();
  };
