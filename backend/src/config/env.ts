import "dotenv/config";
import { z } from "zod";

/**
 * Centralized environment configuration.
 * All secrets live in .env — never hardcode credentials.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_TEST: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  CLIENT_URL: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  SHIPPING_FEE: z.coerce.number().default(5),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().default(50),

  MOCK_EMAIL: z.string().default("true").transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
