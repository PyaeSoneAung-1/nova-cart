"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/product/Price";
import { RatingStars } from "@/components/product/RatingStars";
import { api, swrFetcher } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { WishlistItem } from "@/lib/types";

export default function WishlistPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, mutate } = useSWR<WishlistItem[]>(user ? "/wishlist" : null, swrFetcher);

  const remove = async (productId: string) => {
    try {
      await api(`/wishlist/items/${productId}`, { method: "DELETE" });
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove item");
    }
  };

  const addToCart = async (productId: string) => {
    try {
      await api("/cart/items", { method: "POST", body: { productId, quantity: 1 } });
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to cart");
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Your wishlist</h1>
        <p className="mt-2 text-muted-foreground">Sign in to save products you love.</p>
        <Button asChild className="mt-6 rounded-full px-8">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-40" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Nothing saved yet</h1>
        <p className="mt-2 text-muted-foreground">Tap the heart on any product to save it here.</p>
        <Button asChild className="mt-6 rounded-full px-8">
          <Link href="/products">Discover products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Wishlist <span className="text-base font-normal text-muted-foreground">({data.length} items)</span>
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((item) => {
          const p = item.product;
          return (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Link href={`/products/${p.slug}`} className="relative aspect-square overflow-hidden bg-muted">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground/40">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </Link>
              <button
                onClick={() => remove(p.id)}
                className="absolute right-3 top-3 rounded-full bg-background/90 p-2 text-muted-foreground shadow transition-colors hover:text-destructive"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="line-clamp-2 text-sm font-medium">
                  <Link href={`/products/${p.slug}`} className="hover:text-primary">{p.name}</Link>
                </h3>
                <RatingStars rating={Number(p.rating)} count={p.ratingCount} />
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Price price={p.price} discountPrice={p.discountPrice} />
                  <Button
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => addToCart(p.id)}
                    disabled={p.stock === 0}
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
