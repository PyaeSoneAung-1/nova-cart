"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, swrFetcher } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS_STYLES } from "@/lib/order-status";
import type { Order, OrderStatus, Paginated } from "@/lib/types";

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), limit: "15" });
  if (status) query.set("status", status);
  if (search.trim()) query.set("search", search.trim());

  const { data, isLoading, mutate } = useSWR<Paginated<Order>>(`/orders/admin/all?${query}`, swrFetcher);

  const changeStatus = async (orderId: string, next: OrderStatus) => {
    try {
      await api(`/orders/admin/${orderId}/status`, { method: "PATCH", body: { status: next } });
      toast.success(`Order moved to ${next}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-sm text-muted-foreground">{data ? `${data.meta.total} orders` : "Manage customer orders"}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order # or customer…"
            className="pl-9"
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { const next = v ?? ""; setStatus(next === "all" ? "" : next); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.placedAt)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{order.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatPrice(order.total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.paymentStatus === "PAID" ? "default" : order.paymentStatus === "REFUNDED" ? "destructive" : "outline"}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_STYLES[order.status]?.variant ?? "secondary"}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Select value={order.status} onValueChange={(v) => changeStatus(order.id, v as OrderStatus)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s !== order.status).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button asChild variant="outline" size="sm" className="h-8">
                        <Link href={`/admin/orders/${order.id}`}>View</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No orders match your filters</p>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!data.meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!data.meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </AdminShell>
  );
}
