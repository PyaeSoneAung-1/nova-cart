import { prisma } from "../config/prisma";
import { serializeData } from "../utils/serialize";

/** Revenue = sum of order totals for orders that were actually paid. */
function revenueWhere() {
  return {
    paymentStatus: "PAID" as const,
    status: { not: "CANCELLED" as const },
  };
}

export const statsService = {
  /** KPI cards for the admin dashboard. */
  async overview() {
    const [
      revenueAgg,
      todayAgg,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      lowStock,
      ratingAgg,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: revenueWhere(),
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          ...revenueWhere(),
          placedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.order.aggregate({ _avg: { total: true }, _count: true }),
    ]);

    const revenue = revenueAgg._sum.total?.toNumber() ?? 0;
    const orders = revenueAgg._count;

    return {
      revenue,
      orders,
      averageOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
      revenueToday: todayAgg._sum.total?.toNumber() ?? 0,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts: lowStock,
    };
  },

  /** Revenue + orders grouped by day for charts. */
  async revenueOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<
      { day: Date; revenue: number; orders: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', "placedAt")::date AS day,
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' AND "status" != 'CANCELLED' THEN "total" ELSE 0 END), 0)::float8 AS revenue,
        COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "placedAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "placedAt")::date
      ORDER BY day ASC
    `;

    return rows.map((r) => ({
      day: new Date(r.day).toISOString().slice(0, 10),
      revenue: Math.round(r.revenue * 100) / 100,
      orders: Number(r.orders),
    }));
  },

  /** Top-selling products by quantity sold. */
  async topProducts(limit = 5) {
    const rows = await prisma.$queryRaw<
      { productId: string; name: string; sku: string; sold: bigint; revenue: number }[]
    >`
      SELECT
        oi."productId",
        MAX(oi."name") AS name,
        MAX(oi."sku") AS sku,
        SUM(oi."quantity")::bigint AS sold,
        SUM(oi."total")::float8 AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."status" != 'CANCELLED'
      GROUP BY oi."productId"
      ORDER BY sold DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      sold: Number(r.sold),
      revenue: Math.round(r.revenue * 100) / 100,
    }));
  },

  /** Sales grouped by category. */
  async salesByCategory() {
    const rows = await prisma.$queryRaw<
      { categoryId: string; category: string; sales: bigint; revenue: number }[]
    >`
      SELECT
        c.id AS "categoryId",
        c.name AS category,
        SUM(oi."quantity")::bigint AS sales,
        SUM(oi."total")::float8 AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."status" != 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;

    return rows.map((r) => ({
      categoryId: r.categoryId,
      category: r.category,
      sales: Number(r.sales),
      revenue: Math.round(r.revenue * 100) / 100,
    }));
  },
};
