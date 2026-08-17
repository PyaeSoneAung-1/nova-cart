"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Package } from "lucide-react";
import { AccountShell } from "@/components/account/AccountShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, swrFetcher } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderStatus, Paginated } from "@/lib/types";
import { ORDER_STATUS_STYLES } from "@/lib/order-status";

const TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrdersPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading, mutate } = useSWR<Paginated<Order>>(
    `/orders?limit=50${status ? `&status=${status}` : ""}`,
    swrFetcher,
  );

  const cancel = async (orderId: string) => {
    try {
      await api(`/orders/${orderId}/cancel`, { method: "PATCH" });
      await mutate();
    } catch {
      /* handled by toast? keep simple */
    }
  };

  return (
    <AccountShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Order history</h2>
          <p className="text-sm text-muted-foreground">Track and manage your orders</p>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-4">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="space-y-4">
            {data.items.map((order) => (
              <div key={order.id} className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/account/orders/${order.id}`} className="font-semibold hover:text-primary">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Placed {formatDate(order.placedAt)} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ORDER_STATUS_STYLES[order.status as OrderStatus]?.variant ?? "secondary"}>
                      {order.status}
                    </Badge>
                    <Badge variant={order.paymentStatus === "PAID" ? "default" : "outline"}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="h-10 w-10 overflow-hidden rounded-lg border bg-muted">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/account/orders/${order.id}`}>View details</Link>
                    </Button>
                    {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Cancel order ${order.orderNumber}?`)) void cancel(order.id);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No orders here</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {status ? `You have no ${status.toLowerCase()} orders.` : "When you place an order, it will show up here."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        )}
      </div>
    </AccountShell>
  );
}
