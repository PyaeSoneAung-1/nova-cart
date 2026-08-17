import { Router } from "express";
import { cartController, wishlistController } from "../controllers/cartController";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { z } from "zod";
import { idParamSchema } from "../validators/catalog";
import { addCartItemSchema, updateCartItemSchema, wishlistItemSchema } from "../validators/cart";

const cartRouter = Router();
const wishlistRouter = Router();

cartRouter.use(authenticate);

// ── Cart ─────────────────────────────────────────────────────────────────
cartRouter.get("/", cartController.getCart);
cartRouter.post("/items", validate(addCartItemSchema), cartController.addItem);
cartRouter.patch(
  "/items/:id",
  validate(idParamSchema, "params"),
  validate(updateCartItemSchema),
  cartController.updateItem,
);
cartRouter.delete("/items/:id", validate(idParamSchema, "params"), cartController.removeItem);
cartRouter.delete("/", cartController.clearCart);

// ── Wishlist ─────────────────────────────────────────────────────────────
wishlistRouter.use(authenticate);
wishlistRouter.get("/", wishlistController.getWishlist);
wishlistRouter.post("/items", validate(wishlistItemSchema), wishlistController.addItem);
wishlistRouter.delete(
  "/items/:productId",
  validate(z.object({ productId: z.string().min(1).max(64) }), "params"),
  wishlistController.removeItem,
);

export { cartRouter, wishlistRouter };
