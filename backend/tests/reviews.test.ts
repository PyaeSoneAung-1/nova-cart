import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createProduct, createAdminTokens, createAddress, addToCart } from "./helpers";
import { prisma } from "../src/config/prisma";

describe("Reviews API", () => {
  async function seedPurchasedProduct() {
    const admin = await createAdminTokens();
    const { id: productId } = await createProduct(admin, { price: 50, stock: 10 });
    const { tokens, user } = await registerUser();
    const addressId = await createAddress(user.id);
    await addToCart(tokens, productId, 1);
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(201);
    return { tokens, user, productId };
  }

  it("lets a verified buyer review a product they purchased", async () => {
    const { tokens, productId } = await seedPurchasedProduct();

    const res = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 5, comment: "Excellent product, highly recommended!" })
      .expect(201);

    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.isVerifiedPurchase).toBe(true);

    // Product rating is refreshed.
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.rating.toNumber()).toBe(5);
    expect(product!.ratingCount).toBe(1);
  });

  it("allows reviews without a purchase (unverified)", async () => {
    const admin = await createAdminTokens();
    const { id: productId } = await createProduct(admin, {});
    const { tokens } = await registerUser();

    const res = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 4, comment: "Looks great from the listing." })
      .expect(201);
    expect(res.body.data.isVerifiedPurchase).toBe(false);
  });

  it("prevents duplicate reviews per user per product", async () => {
    const { tokens, productId } = await seedPurchasedProduct();
    await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 5, comment: "First review." })
      .expect(201);

    const res = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 3, comment: "Second attempt." })
      .expect(409);
    expect(res.body.message).toMatch(/already reviewed/i);
  });

  it("lists reviews publicly with the reviewer name", async () => {
    const { tokens, productId } = await seedPurchasedProduct();
    await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 4, comment: "Solid product." })
      .expect(201);

    const res = await request(app).get(`/api/v1/products/${productId}/reviews`).expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].user.name).toBeTruthy();
  });

  it("lets a user update and delete their own review", async () => {
    const { tokens, productId } = await seedPurchasedProduct();
    const created = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 3, comment: "Okay product." })
      .expect(201);
    const reviewId = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 5, comment: "Changed my mind — it's great!" })
      .expect(200);
    expect(updated.body.data.rating).toBe(5);

    await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.ratingCount).toBe(0);
    expect(product!.rating.toNumber()).toBe(0);
  });

  it("cannot update another user's review", async () => {
    const { tokens, productId } = await seedPurchasedProduct();
    const created = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 5, comment: "Mine!" })
      .expect(201);

    const other = await registerUser();
    await request(app)
      .patch(`/api/v1/reviews/${created.body.data.id}`)
      .set("Authorization", `Bearer ${other.tokens.accessToken}`)
      .send({ rating: 1 })
      .expect(404);
  });

  it("validates rating bounds", async () => {
    const admin = await createAdminTokens();
    const { id: productId } = await createProduct(admin, {});
    const { tokens } = await registerUser();

    await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 6 })
      .expect(422);
  });

  it("lets admins delete any review", async () => {
    const { tokens, productId } = await seedPurchasedProduct();
    const created = await request(app)
      .post(`/api/v1/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ rating: 2, comment: "Not great." })
      .expect(201);

    const admin = await createAdminTokens();
    const list = await request(app)
      .get("/api/v1/reviews/admin/all")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(list.body.data.items.some((r: { id: string }) => r.id === created.body.data.id)).toBe(true);

    await request(app)
      .delete(`/api/v1/reviews/admin/${created.body.data.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);
  });
});
