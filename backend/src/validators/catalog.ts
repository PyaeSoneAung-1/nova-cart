import { z } from "zod";

export const moneySchema = z
  .number({ message: "Must be a number" })
  .nonnegative("Must be zero or positive")
  .max(1_000_000_000, "Value is too large");

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(255),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(60).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(64).optional(),
  brand: z.string().trim().max(64).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  sort: z
    .enum([
      "newest",
      "oldest",
      "price-asc",
      "price-desc",
      "rating-desc",
      "popular",
    ])
    .optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10).max(10_000),
  price: moneySchema.refine((v) => v > 0, "Price must be greater than zero"),
  discountPrice: moneySchema.optional(),
  sku: z.string().min(2).max(64),
  stock: z.number().int().nonnegative().max(1_000_000).default(0),
  isPublished: z.boolean().default(true),
  categoryId: z.string().min(1),
  brandId: z.string().optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().url("Image URL must be valid").max(500),
        alt: z.string().max(200).optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .max(10)
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(2).max(64),
        size: z.string().max(20).optional(),
        color: z.string().max(30).optional(),
        price: moneySchema.optional(),
        stock: z.number().int().nonnegative().max(1_000_000).default(0),
      }),
    )
    .max(20)
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  image: z.string().url("Image URL must be valid").max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createBrandSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  image: z.string().url().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export const adjustInventorySchema = z.object({
  change: z
    .number({ message: "change is required" })
    .int("change must be an integer")
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, "change must not be zero"),
  reason: z.string().min(3).max(300),
});
