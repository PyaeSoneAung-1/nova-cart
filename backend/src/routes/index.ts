import { Router } from "express";
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

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "NovaCart API is healthy", data: { uptime: process.uptime() } });
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
