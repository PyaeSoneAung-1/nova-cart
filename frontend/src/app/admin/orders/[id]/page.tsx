"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, swrFetcher } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS_STEPS } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, isLoading, mutate } = useSWR<Order>(`/orders/admin/${params.id}`, swrFetcher);

  if (isLoading || !order) {
    return (
      <AdminShell>
        <Skeleton className="h-96 rounded-xl" />
      </AdminShell>
    );
  }

  const addr = order.addressSnapshot;
  const stepIndex = ORDER_STATUS_STEPS.indexOf(order.status as (typeof ORDER_STATUS_STEPS)[number]);
  const cancelled = order.status === "CANCELLED";

  const changeStatus = async (next: OrderStatus) => {
    try {
      const updated = await api<Order>(`/orders/admin/${order.id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast.success(`Order moved to ${updated.status}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid status transition");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
              <Link href="/admin/orders">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to orders
              </Link>
            </Button>
            <h2 className="mt-1 text-xl font-bold">{order.orderNumber}</h2>
            <p className="text-sm text-muted-foreground">
              Placed {formatDateTime(order.placedAt)} by {order.user?.name} ({order.user?.email})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>{order.status}</Badge>
            <Badge variant={order.paymentStatus === "PAID" ? "default" : "outline"}>{order.paymentStatus}</Badge>
          </div>
        </div>

        {!cancelled && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Advance status</CardTitle>
              <Select value={order.status} onValueChange={(v) => changeStatus(v as OrderStatus)}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_STEPS.filter((s) => s !== order.status).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                {ORDER_STATUS_STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  return (
                    <div key={step} className={cn("flex items-center", i < ORDER_STATUS_STEPS.length - 1 && "flex-1")}>
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                            done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className={cn("text-[10px] font-medium uppercase sm:text-xs", done ? "text-foreground" : "text-muted-foreground")}>
                          {step}
                        </span>
                      </div>
                      {i < ORDER_STATUS_STEPS.length - 1 && (
                        <div className={cn("mx-2 mb-5 h-0.5 flex-1 rounded sm:mx-3", i < stepIndex ? "bg-primary" : "bg-muted")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku} · Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(item.total)}</p>
                </div>
              ))}
              <div className="space-y-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span><span>{order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span><span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Shipping address</CardTitle></CardHeader>
              <CardContent className="space-y-0.5 text-sm">
                <p className="font-medium">{addr.recipientName ?? "—"}</p>
                <p className="text-muted-foreground">{[addr.line1, addr.line2].filter(Boolean).join(", ")}</p>
                <p className="text-muted-foreground">{[addr.city, addr.state].filter(Boolean).join(", ")} {addr.postalCode ?? ""}</p>
                <p className="text-muted-foreground">{addr.country} · {addr.phone}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{order.paymentMethod === "CARD" ? "Card (mock)" : "Cash on delivery"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={order.paymentStatus === "PAID" ? "default" : order.paymentStatus === "REFUNDED" ? "destructive" : "outline"}>
                    {order.paymentStatus}
                  </Badge>
                </div>
                {order.payment?.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction</span>
                    <span className="font-mono text-xs">{order.payment.transactionId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
