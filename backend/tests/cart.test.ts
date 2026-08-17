import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createProduct, createAdminTokens, addToCart } from "./helpers";
import { prisma } from "../src/config/prisma";

describe("Cart API", () => {
  it("requires authentication", async () => {
    await request(app).get("/api/v1/cart").expect(401);
  });

  it("starts empty for a new user", async () => {
    const { tokens } = await registerUser();
    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.itemCount).toBe(0);
    expect(res.body.data.subtotal).toBe(0);
  });

  it("adds items and returns server-computed totals", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { price: 20, discountPrice: 15, stock: 10 });
    const { tokens } = await registerUser();

    await addToCart(tokens, id, 2);

    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    const data = res.body.data;
    expect(data.items).toHaveLength(1);
    expect(data.itemCount).toBe(2);
    expect(data.subtotal).toBe(40);
    expect(data.discount).toBe(10); // (20 - 15) * 2
    expect(data.shippingFee).toBe(5); // below free-shipping threshold
    expect(data.total).toBe(35);
  });

  it("merges quantity when the same item is added twice", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 10 });
    const { tokens } = await registerUser();

    await addToCart(tokens, id, 1);
    await addToCart(tokens, id, 2);

    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it("rejects quantities beyond stock", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 2 });
    const { tokens } = await registerUser();

    const res = await addToCart(tokens, id, 5);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock/i);
  });

  it("rejects out-of-stock products", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 0 });
    const { tokens } = await registerUser();

    const res = await addToCart(tokens, id, 1);
    expect(res.status).toBe(409);
  });

  it("rejects adding an unpublished product", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { isPublished: false, stock: 5 });
    const { tokens } = await registerUser();

    const res = await addToCart(tokens, id, 1);
    expect(res.status).toBe(404);
  });

  it("updates item quantity", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 10 });
    const { tokens, user } = await registerUser();
    await addToCart(tokens, id, 1);

    const cart = await prisma.cart.findFirst({ where: { userId: user.id } });
    const item = await prisma.cartItem.findFirst({ where: { cartId: cart!.id } });

    const res = await request(app)
      .patch(`/api/v1/cart/items/${item!.id}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ quantity: 4 })
      .expect(200);
    expect(res.body.data.quantity).toBe(4);
  });

  it("removes an item and clears the cart", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 10 });
    const { tokens, user } = await registerUser();
    await addToCart(tokens, id, 1);

    const cart = await prisma.cart.findFirst({ where: { userId: user.id } });
    const item = await prisma.cartItem.findFirst({ where: { cartId: cart!.id } });

    await request(app)
      .delete(`/api/v1/cart/items/${item!.id}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);

    await request(app).delete("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);

    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it("does not allow touching another user's cart item", async () => {
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, { stock: 10 });
    const { tokens, user } = await registerUser();
    const other = await registerUser();
    await addToCart(tokens, id, 1);

    const cart = await prisma.cart.findFirst({ where: { userId: user.id } });
    const item = await prisma.cartItem.findFirst({ where: { cartId: cart!.id } });

    const res = await request(app)
      .patch(`/api/v1/cart/items/${item!.id}`)
      .set("Authorization", `Bearer ${other.tokens.accessToken}`)
      .send({ quantity: 3 })
      .expect(404);
    expect(res.body.success).toBe(false);
  });
});
