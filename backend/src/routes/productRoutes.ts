import { Router } from "express";
import { productController } from "../controllers/productController";
import { validate } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/auth";
import {
  idParamSchema,
  productQuerySchema,
  paginationQuerySchema,
  createProductSchema,
  updateProductSchema,
} from "../validators/catalog";

const router = Router();

// ── Public ───────────────────────────────────────────────────────────────
router.get("/", validate(productQuerySchema, "query"), productController.listPublic);

// ── Admin ────────────────────────────────────────────────────────────────
// Registered BEFORE /:id so it is not captured by the id param.
router.get(
  "/admin/list",
  authenticate,
  authorize("ADMIN"),
  validate(paginationQuerySchema, "query"),
  productController.adminList,
);
router.get(
  "/admin/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  productController.adminGet,
);

router.get("/:id", validate(idParamSchema, "params"), productController.getPublic);

router.post("/", authenticate, authorize("ADMIN"), validate(createProductSchema), productController.create);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  validate(updateProductSchema),
  productController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(idParamSchema, "params"),
  productController.remove,
);

export default router;
