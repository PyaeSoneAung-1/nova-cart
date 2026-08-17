import { Router } from "express";
import { statsController, inventoryController } from "../controllers/adminController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import { idParamSchema, paginationQuerySchema, adjustInventorySchema } from "../validators/catalog";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// ── Dashboard analytics ──────────────────────────────────────────────────
router.get("/stats", statsController.overview);
router.get("/revenue", statsController.revenueOverTime);
router.get("/top-products", statsController.topProducts);
router.get("/sales-by-category", statsController.salesByCategory);

// ── Inventory ────────────────────────────────────────────────────────────
router.get("/inventory", validate(paginationQuerySchema, "query"), inventoryController.list);
router.get("/inventory/logs", inventoryController.logs);
router.patch(
  "/inventory/:id",
  validate(idParamSchema, "params"),
  validate(adjustInventorySchema),
  inventoryController.adjust,
);

export default router;
