import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(100),
});

export const wishlistItemSchema = z.object({
  productId: z.string().min(1),
});
