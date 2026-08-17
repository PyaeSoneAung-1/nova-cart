import { beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { prisma } from "../src/config/prisma";

/**
 * Per-suite setup: reset all tables before each test file's tests run.
 * Each test file is responsible for seeding its own fixtures.
 */
const TABLES = [
  "InventoryLog",
  "Payment",
  "OrderItem",
  "Order",
  "Review",
  "Coupon",
  "CartItem",
  "Cart",
  "WishlistItem",
  "Wishlist",
  "Address",
  "ProductVariant",
  "ProductImage",
  "Product",
  "Brand",
  "Category",
  "RefreshToken",
  "PasswordResetToken",
  "User",
];

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.$transaction([
    ...TABLES.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)),
  ]);
});

afterAll(async () => {
  await prisma.$transaction([
    ...TABLES.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)),
  ]);
  await prisma.$disconnect();
});
