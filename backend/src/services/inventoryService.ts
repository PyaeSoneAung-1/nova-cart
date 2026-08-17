import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { serializeData } from "../utils/serialize";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

export const inventoryService = {
  /** Admin: product-level inventory with variants, optional low-stock filter. */
  async list(query: { page?: number; limit?: number; lowStock?: string; search?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const lowStockOnly = query.lowStock === "true";

    const where = {
      ...(lowStockOnly && { stock: { lte: 5 } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { sku: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          isPublished: true,
          variants: { select: { id: true, sku: true, size: true, color: true, stock: true } },
        },
        orderBy: { stock: "asc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { items: serializeData(products), meta: buildPaginationMeta(page, limit, total) };
  },

  /** Adjust stock (positive or negative) with an audit log. Never goes negative. */
  async adjust(
    productId: string,
    data: { change: number; reason: string; variantId?: string },
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");

    let variant = null;
    if (data.variantId) {
      variant = await prisma.productVariant.findUnique({ where: { id: data.variantId } });
      if (!variant || variant.productId !== productId) {
        throw ApiError.badRequest("Variant does not belong to this product");
      }
    }

    const target = variant ?? product;
    const newStock = target.stock + data.change;
    if (newStock < 0) {
      throw ApiError.badRequest(
        `Cannot reduce below zero. Current stock is ${target.stock}.`,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = data.variantId
        ? await tx.productVariant.update({
            where: { id: data.variantId },
            data: { stock: newStock },
          })
        : await tx.product.update({ where: { id: productId }, data: { stock: newStock } });

      await tx.inventoryLog.create({
        data: {
          productId,
          variantId: data.variantId ?? null,
          change: data.change,
          reason: data.reason,
        },
      });
      return updated;
    });

    return serializeData(result);
  },

  /** Recent inventory activity log. */
  async recentLogs(limit = 50) {
    const logs = await prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, sku: true, color: true, size: true } },
      },
    });
    return serializeData(logs);
  },
};
