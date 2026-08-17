import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Prisma client singleton.
 * In tests, the global setup swaps DATABASE_URL to the test database
 * before this module is first imported.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
