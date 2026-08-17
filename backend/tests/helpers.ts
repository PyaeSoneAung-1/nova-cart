import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";

export const app = createApp();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Register a fresh customer and return tokens + user. */
export async function registerUser(overrides: Record<string, unknown> = {}) {
  const body = {
    name: "Test Customer",
    email: `customer_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`,
    password: "Password@123",
    ...overrides,
  };
  const res = await request(app).post("/api/v1/auth/register").send(body).expect(201);
  return { tokens: res.body.data as AuthTokens, user: res.body.data.user, email: body.email, password: body.password };
}

/** Create a user directly in the DB (no API call). */
export async function createUser(data: { name?: string; email?: string; password?: string; role?: "CUSTOMER" | "ADMIN" }) {
  return prisma.user.create({
    data: {
      name: data.name ?? "Direct User",
      email: data.email ?? `direct_${Date.now()}@test.com`,
      password: await hashPassword(data.password ?? "Password@123"),
      role: data.role ?? "CUSTOMER",
    },
  });
}

/** Login and return tokens. */
export async function login(email: string, password: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
  return res.body.data as AuthTokens;
}

export interface SeedProduct {
  product: Record<string, any>;
  id: string;
}

/** Create a category + brand + product via the admin API. */
export async function createProduct(
  adminTokens: AuthTokens,
  overrides: Record<string, unknown> = {},
): Promise<SeedProduct> {
  const category = await prisma.category.create({
    data: { name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}` },
  });
  const brand = await prisma.brand.create({
    data: { name: `Brand ${Date.now()}`, slug: `brand-${Date.now()}` },
  });

  const body = {
    name: `Product ${Date.now()}`,
    description: "A well-crafted test product with enough description length to pass validation.",
    price: 100,
    discountPrice: 80,
    sku: `SKU-${Date.now()}`,
    stock: 50,
    categoryId: category.id,
    brandId: brand.id,
    isPublished: true,
    ...overrides,
  };

  const res = await request(app)
    .post("/api/v1/products")
    .set("Authorization", `Bearer ${adminTokens.accessToken}`)
    .send(body)
    .expect(201);

  return { product: res.body.data, id: res.body.data.id };
}

/** Seed an admin user in the DB and return tokens. */
export async function createAdminTokens() {
  const user = await createUser({ name: "Admin", role: "ADMIN" });
  return login(user.email, "Password@123");
}

/** Seed a coupon directly in the DB. */
export async function createCoupon(overrides: Record<string, unknown> = {}) {
  return prisma.coupon.create({
    data: {
      code: `TEST${Math.floor(Math.random() * 1e6)}`,
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 0,
      usageLimit: 100,
      ...overrides,
    },
  });
}

/** Give a user an address and return its id. */
export async function createAddress(userId: string, overrides: Record<string, unknown> = {}) {
  const address = await prisma.address.create({
    data: {
      userId,
      recipientName: "Test Buyer",
      phone: "+959123456789",
      line1: "12 Pyay Road",
      city: "Yangon",
      country: "Myanmar",
      ...overrides,
    },
  });
  return address.id;
}

/** Add an item to a user's cart via the API (does not assert status). */
export function addToCart(tokens: AuthTokens, productId: string, quantity = 1) {
  return request(app)
    .post("/api/v1/cart/items")
    .set("Authorization", `Bearer ${tokens.accessToken}`)
    .send({ productId, quantity });
}
