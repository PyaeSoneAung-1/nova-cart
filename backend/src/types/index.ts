import { Request } from "express";
import { Role } from "@prisma/client";

/** Authenticated user attached to the request by the auth middleware. */
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export { Role };

/** HTTP status codes used across the API. */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
}

export type QueryWithPagination = Request["query"] & PaginationQuery;
