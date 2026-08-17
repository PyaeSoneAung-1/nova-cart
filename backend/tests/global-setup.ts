import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Global setup: point DATABASE_URL at the test database and apply migrations.
 * Runs once before the whole suite.
 */
const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://novacart:novacart_dev_password@localhost:5432/novacart_test?schema=public";

export default function globalSetup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.NODE_ENV = "test";

  // Reset the test database from scratch.
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  try {
    execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
  } finally {
    prisma.$disconnect();
  }
}
