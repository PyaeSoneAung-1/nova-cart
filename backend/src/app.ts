import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { limiter } from "./middlewares/rateLimiter";
import { env } from "./config/env";

/** Builds and configures the Express application. */
export function createApp(): Application {
  const app = express();

  // Trust the first proxy hop (needed behind reverse proxies / Render / VPS).
  app.set("trust proxy", 1);

  // ── Security headers ────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS — only the configured frontend origin ──────────────────────────
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? env.CLIENT_URL : true,
      credentials: true, // allow the refresh-token cookie
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // ── Body parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // ── Global rate limiting ────────────────────────────────────────────────
  app.use("/api", limiter);

  // ── Routes ──────────────────────────────────────────────────────────────
  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "NovaCart API",
      data: { version: "1.0.0", docs: "/api/v1/health" },
    });
  });

  app.use("/api/v1", apiRoutes);

  // ── 404 + centralized error handling ────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
