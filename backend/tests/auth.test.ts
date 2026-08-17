import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createUser, login } from "./helpers";
import { prisma } from "../src/config/prisma";

describe("Auth", () => {
  describe("POST /auth/register", () => {
    it("registers a customer and returns tokens", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Jane Doe", email: "jane@test.com", password: "Password@123" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("jane@test.com");
      expect(res.body.data.user.role).toBe("CUSTOMER");
      expect(res.body.data.user).not.toHaveProperty("password");
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();

      // Cart + wishlist are created for the new user.
      const user = await prisma.user.findUnique({ where: { email: "jane@test.com" } });
      expect(user).not.toBeNull();
      expect(await prisma.cart.count({ where: { userId: user!.id } })).toBe(1);
      expect(await prisma.wishlist.count({ where: { userId: user!.id } })).toBe(1);
    });

    it("rejects an invalid email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Jane", email: "not-an-email", password: "Password@123" })
        .expect(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe("email");
    });

    it("rejects a weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Jane", email: "jane2@test.com", password: "short" })
        .expect(422);
      expect(res.body.errors[0].field).toBe("password");
    });

    it("rejects a duplicate email with 409", async () => {
      await registerUser({ email: "dup@test.com" });
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Other", email: "dup@test.com", password: "Password@123" })
        .expect(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("never stores the plain-text password", async () => {
      await registerUser({ email: "hashcheck@test.com" });
      const user = await prisma.user.findUnique({ where: { email: "hashcheck@test.com" } });
      expect(user!.password).not.toBe("Password@123");
      expect(user!.password).toMatch(/^\$2[aby]\$/);
    });
  });

  describe("POST /auth/login", () => {
    it("logs in with correct credentials", async () => {
      const { user, password } = await registerUser();
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password })
        .expect(200);
      expect(res.body.data.accessToken).toBeTruthy();
    });

    it("rejects wrong password with 401", async () => {
      const { user } = await registerUser();
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "WrongPass@1" })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects login for a deactivated account", async () => {
      const { user } = await registerUser();
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "Password@123" })
        .expect(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });

  describe("GET /auth/me", () => {
    it("returns the current user for a valid token", async () => {
      const { tokens } = await registerUser();
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(res.body.data.email).toBeTruthy();
    });

    it("returns 401 without a token", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });

    it("returns 401 with a garbage token", async () => {
      await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer garbage.token.here").expect(401);
    });
  });

  describe("POST /auth/refresh (rotation)", () => {
    it("rotates the refresh token", async () => {
      const { tokens } = await registerUser();
      const first = await prisma.refreshToken.count();
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).not.toBe(tokens.refreshToken);
      const second = await prisma.refreshToken.count();
      expect(second).toBe(first + 1); // old token revoked, new token stored

      // Old token can no longer be used.
      await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it("rejects an invalid refresh token", async () => {
      await request(app).post("/api/v1/auth/refresh").send({ refreshToken: "not-a-jwt" }).expect(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("revokes the refresh token", async () => {
      const { tokens, user } = await registerUser();
      await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const stored = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(stored.every((t) => t.revokedAt !== null)).toBe(true);
    });
  });

  describe("Forgot / reset password", () => {
    it("returns a dev reset token in mock-email mode", async () => {
      const { user } = await registerUser();
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: user.email })
        .expect(200);
      expect(res.body.data.devResetToken).toBeTruthy();
    });

    it("does not reveal whether an email exists", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nobody@nowhere.test" })
        .expect(200);
      expect(res.body.data.devResetToken).toBeUndefined();
      expect(res.body.message).toMatch(/if that email exists/i);
    });

    it("resets the password with a valid token", async () => {
      const { user } = await registerUser();
      const forgot = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: user.email })
        .expect(200);

      await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: forgot.body.data.devResetToken, password: "NewPassword@99" })
        .expect(200);

      // Old password fails, new password works.
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "Password@123" })
        .expect(401);
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "NewPassword@99" })
        .expect(200);
    });

    it("rejects a used reset token", async () => {
      const { user } = await registerUser();
      const forgot = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: user.email })
        .expect(200);
      const token = forgot.body.data.devResetToken;

      await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token, password: "NewPassword@99" })
        .expect(200);
      await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token, password: "NewPassword@99" })
        .expect(400);
    });
  });

  describe("Authorization", () => {
    it("blocks customers from admin routes", async () => {
      const { tokens } = await registerUser();
      await request(app).get("/api/v1/admin/stats").set("Authorization", `Bearer ${tokens.accessToken}`).expect(403);
    });

    it("allows admins on admin routes", async () => {
      const admin = await createUser({ name: "Root", role: "ADMIN" });
      const tokens = await login(admin.email, "Password@123");
      await request(app).get("/api/v1/admin/stats").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    });
  });
});
