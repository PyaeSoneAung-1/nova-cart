import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { slugify } from "../utils/slugify";
import { serializeData } from "../utils/serialize";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  _count: { select: { reviews: true } },
} satisfies Prisma.ProductInclude;

function effectivePrice(p: { price: Prisma.Decimal; discountPrice: Prisma.Decimal | null }) {
  const price = p.price.toNumber();
  const discountPrice = p.discountPrice ? p.discountPrice.toNumber() : null;
  return discountPrice !== null && discountPrice < price ? discountPrice : price;
}

export const productService = {
  /**
   * Public listing with search, filters, sorting and pagination.
   * Only published products are visible to customers.
   */
  async listPublic(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const search = typeof query.search === "string" ? query.search.trim() : undefined;
    const category = typeof query.category === "string" ? query.category : undefined;
    const brand = typeof query.brand === "string" ? query.brand : undefined;
    const minPrice = typeof query.minPrice === "number" ? query.minPrice : undefined;
    const maxPrice = typeof query.maxPrice === "number" ? query.maxPrice : undefined;
    const rating = typeof query.rating === "number" ? query.rating : undefined;
    const inStock = query.inStock === "true";

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(category && {
        category: { OR: [{ id: category }, { slug: category }] },
      }),
      ...(brand && {
        brand: { OR: [{ id: brand }, { slug: brand }] },
      }),
      ...(minPrice !== undefined && {
        OR: [
          { price: { gte: minPrice }, discountPrice: null },
          { discountPrice: { gte: minPrice } },
        ],
      }),
      ...(maxPrice !== undefined && {
        OR: [
          { price: { lte: maxPrice }, discountPrice: null },
          { discountPrice: { lte: maxPrice } },
        ],
      }),
      ...(rating !== undefined && { rating: { gte: rating } }),
      ...(inStock && { stock: { gt: 0 } }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === "oldest"
        ? [{ createdAt: "asc" }]
        : query.sort === "price-asc"
          ? [{ price: "asc" }]
          : query.sort === "price-desc"
            ? [{ price: "desc" }]
            : query.sort === "rating-desc"
              ? [{ rating: "desc" }]
              : query.sort === "popular"
                ? [{ ratingCount: "desc" }]
                : [{ createdAt: "desc" }];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { items: serializeData(products), meta: buildPaginationMeta(page, limit, total) };
  },

  /** Public detail page — by id or slug. */
  async getPublic(identifier: string) {
    const product = await prisma.product.findFirst({
      where: {
        isPublished: true,
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: productInclude,
    });
    if (!product) throw ApiError.notFound("Product not found");
    return serializeData(product);
  },

  async getRelated(productId: string, categoryId: string, limit = 4) {
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        categoryId,
        id: { not: productId },
      },
      include: productInclude,
      take: limit,
    });
    return serializeData(products);
  },

  // ── Admin CRUD ─────────────────────────────────────────────────────────

  async adminList(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const search = typeof query.search === "string" ? query.search.trim() : undefined;

    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { items: serializeData(products), meta: buildPaginationMeta(page, limit, total) };
  },

  async adminGet(id: string) {
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw ApiError.notFound("Product not found");
    return serializeData(product);
  },

  async create(data: {
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    sku: string;
    stock?: number;
    isPublished?: boolean;
    categoryId: string;
    brandId?: string | null;
    images?: { url: string; alt?: string; sortOrder?: number }[];
    variants?: { sku: string; size?: string; color?: string; price?: number; stock?: number }[];
  }) {
    const slug = slugify(data.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("A product with this name already exists");

    const { images, variants, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...rest,
          slug,
          ...(images && { images: { create: images } }),
          ...(variants && { variants: { create: variants } }),
        },
        include: productInclude,
      });

      if (variants?.length) {
        // Initial stock is tracked on the product level as well.
        const variantStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
        await tx.product.update({
          where: { id: created.id },
          data: { stock: variantStock || created.stock },
        });
      }
      return created;
    });

    return serializeData(product);
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      discountPrice?: number | null;
      sku?: string;
      stock?: number;
      isPublished?: boolean;
      categoryId?: string;
      brandId?: string | null;
      images?: { url: string; alt?: string; sortOrder?: number }[];
      variants?: { sku: string; size?: string; color?: string; price?: number; stock?: number }[];
    },
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found");

    const { images, variants, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(data.name !== undefined && { slug: slugify(data.name) }),
          ...(images && {
            images: {
              deleteMany: {},
              create: images,
            },
          }),
        },
        include: productInclude,
      });

      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: variants.map((v) => ({ ...v, productId: id })),
        });
        const variantStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
        await tx.product.update({
          where: { id },
          data: { stock: variantStock || updated.stock },
        });
      }
      return updated;
    });

    return serializeData(product);
  },

  async remove(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found");
    await prisma.product.delete({ where: { id } });
  },

  /** Recompute the product rating from its reviews (called after review changes). */
  async refreshRating(productId: string) {
    const aggregate = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Math.round((aggregate._avg.rating ?? 0) * 100) / 100,
        ratingCount: aggregate._count.rating,
      },
    });
  },

  /** Compute the effective (discounted) price as a plain number. */
  effectivePrice,
};
