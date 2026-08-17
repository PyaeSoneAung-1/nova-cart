"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, ArrowRight, CreditCard, Loader2, MapPin, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, swrFetcher } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Address, Cart, Order } from "@/lib/types";

type PaymentMethod = "CARD" | "CASH_ON_DELIVERY";

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setCart = useCartStore((s) => s.setCart);

  const { data: cart, isLoading: cartLoading } = useSWR<Cart>(user ? "/cart" : null, swrFetcher);
  const { data: addresses, isLoading: addressesLoading } = useSWR<Address[]>(user ? "/users/addresses" : null, swrFetcher);

  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState("");

  const selectedAddress = addresses?.find((a) => a.id === addressId) ?? null;

  const totals = useMemo(() => {
    if (!cart) return null;
    return {
      subtotal: cart.subtotal,
      discount: cart.discount + (appliedCoupon?.discount ?? 0),
      shippingFee: cart.shippingFee,
      total: Math.max(0, Math.round((cart.total - (appliedCoupon?.discount ?? 0)) * 100) / 100),
    };
  }, [cart, appliedCoupon]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to check out</h1>
        <p className="mt-2 text-muted-foreground">You need an account to place an order.</p>
        <Button asChild className="mt-6">
          <Link href={`/login?next=/checkout`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  if (cartLoading || addressesLoading || !cart) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-56" />
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some products before checking out.</p>
        <Button asChild className="mt-6 rounded-full px-8">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    try {
      const result = await api<{ discount: number }>("/coupons/validate", {
        method: "POST",
        body: { code: couponCode.trim(), subtotal: cart.subtotal },
      });
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: result.discount });
      toast.success(`Coupon applied — you save ${formatPrice(result.discount)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  const placeOrder = async () => {
    if (!addressId) {
      toast.error("Please select a shipping address");
      return;
    }
    setPlacing(true);
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        body: {
          addressId,
          paymentMethod,
          couponCode: appliedCoupon?.code,
          notes: notes.trim() || undefined,
        },
      });
      setCart({ items: [], itemCount: 0, subtotal: 0, discount: 0, shippingFee: 0, total: 0 });
      router.push(`/checkout/success?order=${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground">
        <Link href="/cart">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to cart
        </Link>
      </Button>
      <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Shipping address */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Shipping address
            </h2>
            {addresses && addresses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAddressId(a.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      addressId === a.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{a.label}</span>
                      {a.isDefault && <span className="text-xs text-muted-foreground">Default</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium">{a.recipientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.line1}, {a.city} {a.postalCode ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.phone}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No saved addresses</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/addresses">
                    <Plus className="mr-1.5 h-4 w-4" /> Add an address first
                  </Link>
                </Button>
              </div>
            )}
          </section>

          <Separator />

          {/* 2. Payment method */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Payment method
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { value: "CARD", title: "Card", desc: "Mock payment — instantly marked as paid", icon: CreditCard },
                  { value: "CASH_ON_DELIVERY", title: "Cash on delivery", desc: "Pay when your order arrives", icon: MapPin },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    paymentMethod === m.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40",
                  )}
                >
                  <m.icon className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {paymentMethod === "CARD" && (
              <p className="mt-3 rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                🔒 Demo checkout — no real card data is collected or stored. A mock transaction is generated instead.
              </p>
            )}
          </section>

          <Separator />

          {/* 3. Coupon + notes */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
              Coupon & notes
            </h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">{appliedCoupon.code}</span>
                  <span className="text-xs text-emerald-600">-{formatPrice(appliedCoupon.discount)}</span>
                </div>
                <button
                  className="text-xs text-emerald-700 underline"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code (try WELCOME10)" className="uppercase" />
                <Button variant="outline" onClick={applyCoupon} disabled={couponBusy || !couponCode.trim()}>
                  {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions…" />
            </div>
          </section>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 p-5">
            <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
            <div className="mb-4 space-y-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2 text-sm">
                  <span className="line-clamp-1 text-muted-foreground">
                    {item.quantity} × {item.product.name}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPrice((item.product.discountPrice ?? item.product.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(totals?.subtotal)}</span>
              </div>
              {totals && totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{totals?.shippingFee === 0 ? "Free" : formatPrice(totals?.shippingFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(totals?.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "CARD" ? "Payable now (mock payment)" : "Payable on delivery"}
              </p>
            </div>
            <Button
              size="lg"
              className="mt-5 w-full rounded-full"
              onClick={placeOrder}
              disabled={placing || !addressId || cart.items.length === 0}
            >
              {placing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  Place order <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
