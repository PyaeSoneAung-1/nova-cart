import { Router } from "express";
import { couponController } from "../controllers/couponController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import { idParamSchema } from "../validators/catalog";
import { validateCouponSchema, createCouponSchema, updateCouponSchema } from "../validators/order";

const router = Router();

// ── Public: coupon validation (used at checkout) ─────────────────────────
router.post("/validate", validate(validateCouponSchema), couponController.validate);

// ── Admin CRUD ───────────────────────────────────────────────────────────
router.use(authenticate, authorize("ADMIN"));
router.get("/", couponController.listAdmin);
router.post("/", validate(createCouponSchema), couponController.create);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateCouponSchema),
  couponController.update,
);
router.delete("/:id", validate(idParamSchema, "params"), couponController.remove);

export default router;
