import { Router } from "express";
import { orderController } from "../controllers/orderController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import { idParamSchema, paginationQuerySchema } from "../validators/catalog";
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } from "../validators/order";

const router = Router();

router.use(authenticate);

// ── Customer ─────────────────────────────────────────────────────────────
router.post("/", validate(createOrderSchema), orderController.create);

// ── Admin (registered before /:id so they are not captured) ─────────────
router.get(
  "/admin/all",
  authorize("ADMIN"),
  validate(orderQuerySchema, "query"),
  orderController.adminList,
);
router.patch(
  "/admin/:id/status",
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateOrderStatusSchema),
  orderController.updateStatus,
);
router.get(
  "/admin/:id",
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  orderController.adminGet,
);

// ── Customer (after admin routes) ────────────────────────────────────────
router.get("/", validate(orderQuerySchema, "query"), orderController.listMine);
router.get("/:id", validate(idParamSchema, "params"), orderController.getMine);
router.patch("/:id/cancel", validate(idParamSchema, "params"), orderController.cancelMine);

export default router;

void paginationQuerySchema; // exported for API docs parity
