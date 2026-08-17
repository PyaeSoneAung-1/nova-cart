import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, registerUser, createProduct, createAdminTokens, createAddress, addToCart } from "./helpers";
import { prisma } from "../src/config/prisma";

async function seedCheckout({
  price = 100,
  discountPrice = undefined,
  stock = 10,
  quantity = 1,
  coupon = null,
}: { price?: number; discountPrice?: number; stock?: number; quantity?: number; coupon?: string | null } = {}) {
  const admin = await createAdminTokens();
  const { id } = await createProduct(admin, { price, discountPrice, stock });
  const { tokens, user } = await registerUser();
  const addressId = await createAddress(user.id);
  await addToCart(tokens, id, quantity);
  return { admin, productId: id, tokens, user, addressId, coupon };
}

describe("Orders API", () => {
  it("creates an order and clears the cart", async () => {
    const { tokens, addressId } = await seedCheckout({ price: 100, quantity: 2 });

    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(201);

    const order = res.body.data;
    expect(order.orderNumber).toMatch(/^NC-/);
    expect(order.paymentStatus).toBe("PAID"); // mock card payment succeeds
    expect(order.subtotal).toBe(200);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.addressSnapshot.city).toBe("Yangon");

    // Cart is cleared after checkout.
    const cart = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(cart.body.data.items).toHaveLength(0);
  });

  it("decrements inventory after a successful order", async () => {
    const { tokens, addressId, productId } = await seedCheckout({ stock: 10, quantity: 3 });
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(201);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.stock).toBe(7);

    const log = await prisma.inventoryLog.findFirst({ where: { productId } });
    expect(log).not.toBeNull();
    expect(log!.change).toBe(-3);
  });

  it("applies a coupon discount", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: "TEST10", type: "PERCENTAGE", value: 10, minOrderAmount: 50, usageLimit: 100 },
    });
    const { tokens, addressId } = await seedCheckout({ price: 100, quantity: 1, coupon: coupon.code });

    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD", couponCode: coupon.code })
      .expect(201);

    expect(res.body.data.discount).toBe(10);
    expect(res.body.data.shippingFee).toBe(0); // subtotal ≥ free-shipping threshold
    expect(res.body.data.total).toBe(90); // 100 - 10 + 0
    expect(res.body.data.coupon.code).toBe("TEST10");

    // Usage count incremented.
    const updated = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    expect(updated!.usedCount).toBe(1);
  });

  it("rejects an invalid coupon at checkout", async () => {
    const { tokens, addressId } = await seedCheckout();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD", couponCode: "NOPE" })
      .expect(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it("rejects an empty cart", async () => {
    const { tokens, user } = await registerUser();
    const addressId = await createAddress(user.id);
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(400);
    expect(res.body.message).toMatch(/empty/i);
  });

  it("rejects a foreign address", async () => {
    const { tokens } = await registerUser();
    const { tokens: otherTokens, user: otherUser } = await registerUser();
    const otherAddress = await createAddress(otherUser.id);
    const admin = await createAdminTokens();
    const { id } = await createProduct(admin, {});
    await addToCart(tokens, id, 1);

    void otherTokens;
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId: otherAddress, paymentMethod: "CARD" })
      .expect(404);
    expect(res.body.message).toMatch(/address/i);
  });

  it("fails when stock runs out between cart and checkout", async () => {
    const { tokens, user, productId, addressId } = await seedCheckout({ stock: 1, quantity: 1 });
    // Another customer buys the last unit.
    await prisma.product.update({ where: { id: productId }, data: { stock: 0 } });

    void user;
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(409);
    expect(res.body.message).toMatch(/stock|available/i);
  });

  it("lets a customer list and view their own orders", async () => {
    const { tokens, addressId } = await seedCheckout();
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(201);

    const list = await request(app).get("/api/v1/orders").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.meta.total).toBe(1);

    const orderId = list.body.data.items[0].id;
    const detail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(detail.body.data.id).toBe(orderId);
  });

  it("hides other customers' orders", async () => {
    const { tokens, addressId } = await seedCheckout();
    await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .send({ addressId, paymentMethod: "CARD" })
      .expect(201);

    const other = await registerUser();
    const list = await request(app).get("/api/v1/orders").set("Authorization", `Bearer ${other.tokens.accessToken}`).expect(200);
    expect(list.body.data.items).toHaveLength(0);

    const mine = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);
    const orderId = mine.body.data.items[0].id;
    await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${other.tokens.accessToken}`)
      .expect(404);
  });

  describe("Cancellation", () => {
    it("customer cancels a PENDING order and stock is restored", async () => {
      const { tokens, addressId, productId } = await seedCheckout({ stock: 5, quantity: 2 });
      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ addressId, paymentMethod: "CARD" })
        .expect(201);

      const list = await request(app).get("/api/v1/orders").set("Authorization", `Bearer ${tokens.accessToken}`).expect(200);
      const orderId = list.body.data.items[0].id;

      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.status).toBe("CANCELLED");
      expect(res.body.data.paymentStatus).toBe("REFUNDED"); // paid order gets refunded

      const product = await prisma.product.findUnique({ where: { id: productId } });
      expect(product!.stock).toBe(5); // restored
    });

    it("cannot cancel a DELIVERED order", async () => {
      const { tokens, addressId } = await seedCheckout();
      const created = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ addressId, paymentMethod: "CARD" })
        .expect(201);
      const orderId = created.body.data.id;

      await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });

      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(400);
      expect(res.body.message).toMatch(/cannot be cancelled/i);
    });

    it("cannot cancel another customer's order", async () => {
      const { tokens, addressId } = await seedCheckout();
      const created = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ addressId, paymentMethod: "CARD" })
        .expect(201);

      const other = await registerUser();
      await request(app)
        .patch(`/api/v1/orders/${created.body.data.id}/cancel`)
        .set("Authorization", `Bearer ${other.tokens.accessToken}`)
        .expect(404);
    });
  });

  describe("Admin status management", () => {
    it("enforces valid state transitions", async () => {
      const { tokens, addressId } = await seedCheckout();
      const created = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ addressId, paymentMethod: "CARD" })
        .expect(201);
      const orderId = created.body.data.id;

      const admin = await createAdminTokens();

      // PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
      for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]) {
        const res = await request(app)
          .patch(`/api/v1/orders/admin/${orderId}/status`)
          .set("Authorization", `Bearer ${admin.accessToken}`)
          .send({ status })
          .expect(200);
        expect(res.body.data.status).toBe(status);
      }

      // DELIVERED → CANCELLED is not allowed.
      const bad = await request(app)
        .patch(`/api/v1/orders/admin/${orderId}/status`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ status: "CANCELLED" })
        .expect(400);
      expect(bad.body.message).toMatch(/cannot move/i);
    });

    it("blocks non-admin status updates", async () => {
      const { tokens, addressId } = await seedCheckout();
      const created = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ addressId, paymentMethod: "CARD" })
        .expect(201);

      const res = await request(app)
        .patch(`/api/v1/orders/admin/${created.body.data.id}/status`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({ status: "SHIPPED" })
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });
});
