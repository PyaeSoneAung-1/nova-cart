"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { swrFetcher } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { AdminStats, CategorySales, RevenuePoint, TopProduct } from "@/lib/types";

const CHART_COLORS = ["#7c3aed", "#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9"];

export default function AdminDashboardPage() {
  const { data: stats } = useSWR<AdminStats>("/admin/stats", swrFetcher);
  const { data: revenue } = useSWR<RevenuePoint[]>("/admin/revenue?days=30", swrFetcher);
  const { data: topProducts } = useSWR<TopProduct[]>("/admin/top-products?limit=5", swrFetcher);
  const { data: byCategory } = useSWR<CategorySales[]>("/admin/sales-by-category", swrFetcher);

  const kpis = stats
    ? [
        { label: "Total revenue", value: formatPrice(stats.revenue), sub: `${formatPrice(stats.revenueToday)} today`, icon: Banknote },
        { label: "Orders", value: String(stats.totalOrders), sub: `${stats.pendingOrders} pending`, icon: ShoppingCart },
        { label: "Customers", value: String(stats.totalCustomers), sub: `${formatPrice(stats.averageOrderValue)} avg order`, icon: Users },
        { label: "Products", value: String(stats.totalProducts), sub: `${stats.lowStockProducts} low stock`, icon: Package },
      ]
    : [];

  return (
    <AdminShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Store performance at a glance</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats ? (
          kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <kpi.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        )}
      </div>

      {stats && stats.lowStockProducts > 0 && (
        <Link href="/admin/inventory" className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100">
          <AlertTriangle className="h-4 w-4" />
          {stats.lowStockProducts} product{stats.lowStockProducts === 1 ? "" : "s"} running low on stock — review inventory.
        </Link>
      )}

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue ?? []} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(value) => [formatPrice(Number(value)), "Revenue"]} labelFormatter={(l) => String(l)} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory ?? []} dataKey="sales" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {(byCategory ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} sold`, String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {(byCategory ?? []).map((c, i) => (
                <div key={c.categoryId} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1 text-muted-foreground">{c.category}</span>
                  <span className="font-medium">{c.sales}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Top-selling products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts ?? []} layout="vertical" margin={{ left: 30, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                <Tooltip formatter={(value, name) => [name === "sold" ? `${value} units` : value, String(name)]} />
                <Bar dataKey="sold" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
