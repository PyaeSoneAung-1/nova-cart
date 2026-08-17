"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/product/Price";
import { api, swrFetcher } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import type { Cart } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setCart = useCartStore((s) => s.setCart);
  const { data, isLoading, mutate } = useSWR<Cart>(user ? "/cart" : null, swrFetcher);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is waiting</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see your cart and check out.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link href="/login">Sign in</Link></Button>
          <Button asChild variant="outline"><Link href="/products">Browse products</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      await api(`/cart/items/${itemId}`, { method: "PATCH", body: { quantity } });
      const cart = await api<Cart>("/cart");
      setCart(cart);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update quantity");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api(`/cart/items/${itemId}`, { method: "DELETE" });
      const cart = await api<Cart>("/cart");
      setCart(cart);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove item");
    }
  };

  const clearCart = async () => {
    if (!confirm("Remove all items from your cart?")) return;
    try {
      await api("/cart", { method: "DELETE" });
      const cart = await api<Cart>("/cart");
      setCart(cart);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear cart");
    }
  };

  if (data.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
        <Button asChild className="mt-6 rounded-full px-8">
          <Link href="/products">
            Start shopping <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const shippingNote = data.shippingFee === 0 && data.subtotal > 0 ? "Free shipping applied 🎉" : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Shopping cart <span className="text-base font-normal text-muted-foreground">({data.itemCount} items)</span>
        </h1>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clearCart}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Clear cart
        </Button>
      </div>

      {shippingNote && (
        <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{shippingNote}</p>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {data.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted"
                >
                  {item.product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0].url} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                      {item.product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/products/${item.product.slug}`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                        {item.product.name}
                      </Link>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground">
                          {[item.variant.color, item.variant.size].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.product.stock > 0 ? `${item.product.stock} in stock` : "Out of stock"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-lg border">
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        aria-label="Increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Price price={item.product.price} discountPrice={item.product.discountPrice} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 p-5">
            <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(data.subtotal)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{data.shippingFee === 0 ? "Free" : formatPrice(data.shippingFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(data.total)}</span>
              </div>
              {data.shippingFee > 0 && (
                <p className="text-xs text-muted-foreground">
                  Add {formatPrice(50 - (data.subtotal - data.discount))} more for free shipping.
                </p>
              )}
            </div>
            <Button asChild size="lg" className="mt-5 w-full rounded-full">
              <Link href="/checkout">
                Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
              <Link href="/products">Continue shopping</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
