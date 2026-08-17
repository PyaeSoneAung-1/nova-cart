"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { swrFetcher } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

function SuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order") ?? "";
  const { data: order, isLoading } = useSWR<Order>(orderId ? `/orders/${orderId}` : null, swrFetcher);

  useEffect(() => {
    if (!orderId) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (isLoading || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">Order confirmed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for shopping with NovaCart. Your order has been placed successfully.
        </p>

        <div className="mt-6 space-y-3 rounded-xl bg-muted/60 p-5 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order number</span>
            <Link href={`/account/orders/${order.id}`} className="font-semibold text-primary hover:underline">
              {order.orderNumber}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{order.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">{order.paymentStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild>
            <Link href={`/account/orders/${order.id}`}>
              <Package className="mr-2 h-4 w-4" /> Track this order
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
