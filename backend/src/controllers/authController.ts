import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authService } from "../services/authService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";
import { env } from "../config/env";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: REFRESH_MAX_AGE_MS,
    path: "/",
  });
}

function readRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  return fromBody ?? fromCookie;
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    setRefreshCookie(res, result.refreshToken);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Account created successfully", result));
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    setRefreshCookie(res, result.refreshToken);
    res.status(HttpStatus.OK).json(successResponse("Logged in successfully", result));
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = readRefreshToken(req);
    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "Refresh token is required", errors: [] });
      return;
    }
    const result = await authService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    res.status(HttpStatus.OK).json(successResponse("Tokens refreshed", result));
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = readRefreshToken(req);
    await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.status(HttpStatus.OK).json(successResponse("Logged out successfully", null));
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(HttpStatus.OK).json(successResponse(result.message, result));
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(HttpStatus.OK).json(successResponse("Password reset successfully. You can now log in.", null));
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.id);
    res.status(HttpStatus.OK).json(successResponse("Current user fetched successfully", user));
  }),
};
