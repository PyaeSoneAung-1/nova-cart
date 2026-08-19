/**
 * Vercel serverless entry point.
 *
 * Lazy boot: the Express app (and its Prisma client) is built on first
 * request inside a try/catch, so any boot-time failure (missing engine
 * binary, env problem, …) is returned as a JSON 500 with the real message
 * instead of an opaque FUNCTION_INVOCATION_FAILED.
 *
 * `server.ts` is used for local development / long-running servers.
 */
import type { IncomingMessage, ServerResponse } from "http";

let app: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let bootError: { message: string; stack?: string } | null = null;

async function boot() {
  if (app || bootError) return;
  try {
    const mod = await import("../src/app");
    app = mod.createApp();
  } catch (err) {
    bootError = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
    // eslint-disable-next-line no-console
    console.error("NOVACART BOOT ERROR:", bootError);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await boot();
  if (bootError || !app) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "BOOT_FAILED", bootError }));
    return;
  }
  app(req, res);
}
