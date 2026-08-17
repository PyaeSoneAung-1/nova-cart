import { HttpStatus, HttpStatusCode } from "../types";

/** Application-level error with an HTTP status code. */
export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errors: unknown[];
  public readonly isOperational: boolean;

  constructor(statusCode: HttpStatusCode, message: string, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", errors: unknown[] = []) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message = "Conflict", errors: unknown[] = []) {
    return new ApiError(HttpStatus.CONFLICT, message, errors);
  }

  static unprocessable(message = "Unprocessable entity", errors: unknown[] = []) {
    return new ApiError(HttpStatus.UNPROCESSABLE, message, errors);
  }

  static tooManyRequests(message = "Too many requests, please slow down") {
    return new ApiError(HttpStatus.TOO_MANY_REQUESTS, message);
  }
}
