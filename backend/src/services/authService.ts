import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateSecureToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token";
import { env } from "../config/env";
import { Role } from "../types";
import { serializeData } from "../utils/serialize";

const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Issues an access token + a rotated refresh token (hashed copy stored). */
async function issueTokens(userId: string, role: Role): Promise<TokenPair> {
  const jti = generateSecureToken(16);
  const refreshToken = signRefreshToken(userId, jti);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return {
    accessToken: signAccessToken(userId, role),
    refreshToken,
  };
}

function publicUser(user: Record<string, unknown>) {
  const { password: _password, ...rest } = user;
  return rest;
}

export interface AuthResult {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase(),
          password: passwordHash,
        },
      });
      // New users get an empty cart and wishlist.
      await tx.cart.create({ data: { userId: created.id } });
      await tx.wishlist.create({ data: { userId: created.id } });
      return created;
    });

        const tokens = await issueTokens(user.id, user.role);

    return { user: serializeData(publicUser(user)), ...tokens };
  },

  async login(data: { email: string; password: string }): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }
    if (!user.isActive) {
      throw ApiError.forbidden("This account has been deactivated. Contact support.");
    }

    const valid = await verifyPassword(data.password, user.password);
    if (!valid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

        const tokens = await issueTokens(user.id, user.role);

    return { user: serializeData(publicUser(user)), ...tokens };
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    let decoded: ReturnType<typeof verifyRefreshToken>;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    void decoded;
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Reuse of a revoked token is a credential-compromise signal: revoke all.
      if (stored?.revokedAt) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account is no longer active");
    }

    // Rotate: revoke the old token, issue a new one.
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedByTokenId: null },
      });
    });

    const jti = generateSecureToken(16);
    const newRefreshToken = signRefreshToken(user.id, jti);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000),
        replacedByTokenId: stored.id,
      },
    });

    return {
      accessToken: signAccessToken(user.id, user.role),
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async forgotPassword(email: string): Promise<{ message: string; devResetToken?: string }> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return the same message to avoid leaking which emails exist.
    if (!user) return { message: "If that email exists, a reset link has been sent." };

    const rawToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
      });
    });

    const result: { message: string; devResetToken?: string } = {
      message: "If that email exists, a reset link has been sent.",
    };
    // In dev/demo the "email" is a mock — return the token so flows are testable.
    if (env.MOCK_EMAIL) {
      result.devResetToken = rawToken;
    }
    return result;
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw ApiError.badRequest("Reset token is invalid or has expired");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: stored.userId },
        data: { password: passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      });
      // Force re-login everywhere after a password reset.
      await tx.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true, addresses: true, reviews: true } },
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    return serializeData(user);
  },


};
