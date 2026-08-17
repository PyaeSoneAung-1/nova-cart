import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { Role } from "../types";

const accessSecret = env.JWT_ACCESS_SECRET;
const refreshSecret = env.JWT_REFRESH_SECRET;

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = { sub: userId, role, type: "access" };
  return jwt.sign(payload, accessSecret, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti, type: "refresh" };
  return jwt.sign(payload, refreshSecret, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
}

/** SHA-256 hash of a raw token — only hashes are stored in the DB. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generate a cryptographically random reset token / code. */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
