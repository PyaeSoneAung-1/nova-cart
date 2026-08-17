import { z } from "zod";
import { Router } from "express";
import { reviewController } from "../controllers/reviewController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import { idParamSchema, paginationQuerySchema } from "../validators/catalog";
import { createReviewSchema, updateReviewSchema } from "../validators/order";

/**
 * Mounted at /products/:productId/reviews  (mergeParams exposes :productId)
 * and /reviews (standalone resource routes).
 */
const productIdParamSchema = z.object({
  productId: z.string().min(1).max(64),
});

export const productReviewRouter = Router({ mergeParams: true });
export const reviewRouter = Router();

// ── Public: list reviews for a product ───────────────────────────────────
productReviewRouter.get(
  "/",
  validate(productIdParamSchema, "params"),
  validate(paginationQuerySchema, "query"),
  reviewController.listForProduct,
);

// ── Customer: create a review for a product ──────────────────────────────
productReviewRouter.post(
  "/",
  authenticate,
  validate(productIdParamSchema, "params"),
  validate(createReviewSchema),
  reviewController.create,
);

// ── Customer: manage own reviews ─────────────────────────────────────────
reviewRouter.use(authenticate);
reviewRouter.get("/mine", validate(paginationQuerySchema, "query"), reviewController.listMine);
reviewRouter.patch("/:id", validate(idParamSchema, "params"), validate(updateReviewSchema), reviewController.update);
reviewRouter.delete("/:id", validate(idParamSchema, "params"), reviewController.remove);

// ── Admin ────────────────────────────────────────────────────────────────
reviewRouter.get(
  "/admin/all",
  authorize("ADMIN"),
  validate(paginationQuerySchema, "query"),
  reviewController.adminList,
);
reviewRouter.delete("/admin/:id", authorize("ADMIN"), validate(idParamSchema, "params"), reviewController.adminRemove);
