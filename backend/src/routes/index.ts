import { Router } from "express";
import { prisma } from "../config/prisma";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import productRoutes from "./productRoutes";
import { categoriesRouter, brandsRouter } from "./catalogRoutes";
import { cartRouter, wishlistRouter } from "./cartRoutes";
import orderRoutes from "./orderRoutes";
import { productReviewRouter, reviewRouter } from "./reviewRoutes";
import couponRoutes from "./couponRoutes";
import adminRoutes from "./adminRoutes";

const router = Router();

// Health does a real 1-row DB probe so the Vercel cron warmup keeps BOTH
// the container and the Neon compute awake (Neon autosuspends after idle).
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: "NovaCart API is healthy",
      data: { uptime: process.uptime(), db: "ok" },
    });
  } catch {
    res.status(503).json({ success: false, message: "Database unreachable" });
  }
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/products/:productId/reviews", productReviewRouter);
router.use("/reviews", reviewRouter);
router.use("/categories", categoriesRouter);
router.use("/brands", brandsRouter);
router.use("/cart", cartRouter);
router.use("/wishlist", wishlistRouter);
router.use("/orders", orderRoutes);
router.use("/coupons", couponRoutes);
router.use("/admin", adminRoutes);

export default router;
