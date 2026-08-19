/**
 * Vercel serverless entry point.
 *
 * Re-exports the Express app so it can run as a serverless function
 * (root vercel.json routes /api/* here). `server.ts` is used for local
 * development / long-running servers (Docker, Render, etc.).
 *
 * Boot errors (e.g. Prisma client init) are caught and returned as a JSON
 * 500 with the real message instead of a generic FUNCTION_INVOCATION_FAILED,
 * which makes serverless failures debuggable from the endpoint itself.
 */
import express from "express";
import { createApp } from "../src/app";

let app: ReturnType<typeof createApp>;

try {
  app = createApp();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("NOVACART BOOT ERROR:", err);
  const fallback = express();
  fallback.use((_req: express.Request, res: express.Response) => {
    res.status(500).json({
      error: "BOOT_FAILED",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });
  app = fallback;
}

export default app;
