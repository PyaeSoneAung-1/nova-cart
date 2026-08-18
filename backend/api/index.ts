/**
 * Vercel serverless entry point.
 *
 * Re-exports the Express app so it can run as a serverless function
 * (backend/vercel.json routes all traffic here). `server.ts` is used for
 * local development / long-running servers (Docker, Render, etc.).
 */
import { createApp } from "../src/app";

const app = createApp();

export default app;
