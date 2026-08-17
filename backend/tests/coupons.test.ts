import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createProduct, createAdminTokens, createCoupon } from "./helpers";


describe("Coupons API", () => {
  describe("POST /coupons/validate", () => {
    it("returns the discount for a valid percentage coupon", async () => {
      await createCoupon({ code: "PCT20", type: "PERCENTAGE", value: 20, maxDiscount: 50 });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "PCT20", subtotal: 100 })
        .expect(200);
      expect(res.body.data.discount).toBe(20);
    });

    it("caps percentage discount at maxDiscount", async () => {
      await createCoupon({ code: "CAP50", type: "PERCENTAGE", value: 30, maxDiscount: 10 });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "CAP50", subtotal: 100 })
        .expect(200);
      expect(res.body.data.discount).toBe(10);
    });

    it("applies fixed-amount coupons", async () => {
      await createCoupon({ code: "FLAT15", type: "FIXED", value: 15 });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "FLAT15", subtotal: 100 })
        .expect(200);
      expect(res.body.data.discount).toBe(15);
    });

    it("rejects an unknown code", async () => {
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "GHOST", subtotal: 100 })
        .expect(400);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it("rejects an inactive coupon", async () => {
      await createCoupon({ code: "OFF", isActive: false });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "OFF", subtotal: 100 })
        .expect(400);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it("rejects an expired coupon", async () => {
      await createCoupon({
        code: "OLDTIMER",
        startsAt: new Date(Date.now() - 30 * 864e5),
        expiresAt: new Date(Date.now() - 10 * 864e5),
      });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "OLDTIMER", subtotal: 100 })
        .expect(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it("rejects a coupon below the minimum order amount", async () => {
      await createCoupon({ code: "MIN100", minOrderAmount: 100 });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "MIN100", subtotal: 50 })
        .expect(400);
      expect(res.body.message).toMatch(/minimum/i);
    });

    it("rejects a coupon that hit its usage limit", async () => {
      await createCoupon({ code: "USEDUP", usageLimit: 1, usedCount: 1 });
      const res = await request(app)
        .post("/api/v1/coupons/validate")
        .send({ code: "USEDUP", subtotal: 100 })
        .expect(400);
      expect(res.body.message).toMatch(/usage limit/i);
    });
  });

  describe("Admin coupon CRUD", () => {
    it("requires admin role", async () => {
      const { tokens } = await registerUser();
      await request(app)
        .post("/api/v1/coupons")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ code: "X", type: "FIXED", value: 5 })
        .expect(403);
    });

    it("creates, lists, updates and deletes a coupon", async () => {
      const admin = await createAdminTokens();

      const created = await request(app)
        .post("/api/v1/coupons")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ code: "SAVE25", type: "PERCENTAGE", value: 25, minOrderAmount: 20 })
        .expect(201);
      expect(created.body.data.code).toBe("SAVE25");

      const list = await request(app).get("/api/v1/coupons").set("Authorization", `Bearer ${admin.accessToken}`).expect(200);
      expect(list.body.data.items.some((c: { code: string }) => c.code === "SAVE25")).toBe(true);

      const id = created.body.data.id;
      const updated = await request(app)
        .patch(`/api/v1/coupons/${id}`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ value: 30 })
        .expect(200);
      expect(updated.body.data.value).toBe(30);

      await request(app)
        .delete(`/api/v1/coupons/${id}`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .expect(200);
    });

    it("rejects duplicate coupon codes", async () => {
      const admin = await createAdminTokens();
      await createCoupon({ code: "DUP" });
      const res = await request(app)
        .post("/api/v1/coupons")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ code: "dup", type: "FIXED", value: 5 })
        .expect(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("rejects percentage values above 100", async () => {
      const admin = await createAdminTokens();
      const res = await request(app)
        .post("/api/v1/coupons")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ code: "TOOMUCH", type: "PERCENTAGE", value: 150 })
        .expect(422);
      expect(res.body.errors[0].message).toMatch(/100/);
    });
  });
});

describe("Wishlist API", () => {
  it("adds, lists and removes wishlist items", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, {});
    const { tokens } = await registerUser();

    await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ productId: id })
      .expect(201);

    const list = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(list.body.data).toHaveLength(1);

    // Duplicate add is prevented.
    await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ productId: id })
      .expect(409);

    await request(app)
      .delete(`/api/v1/wishlist/items/${id}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);

    const empty = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(empty.body.data).toHaveLength(0);
  });

  it("rejects wishlist access without auth", async () => {
    await request(app).get("/api/v1/wishlist").expect(401);
  });
});
