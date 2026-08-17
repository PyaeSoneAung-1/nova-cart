"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import type { Cart, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/product/RatingStars";
import { Price } from "@/components/product/Price";
import { discountPercent, formatPrice } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";

export function ProductCard({ product }: { product: Product }) {
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const discount = discountPercent(product);
  const image = product.images?.[0]?.url;

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to add items to your cart");
      return;
    }
    setBusy(true);
    try {
      await api("/cart/items", { method: "POST", body: { productId: product.id, quantity: 1 } });
      const cart = await api<Cart>("/cart");
      useCartStore.getState().setCart(cart);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to use your wishlist");
      return;
    }
    setBusy(true);
    try {
      await api("/wishlist/items", { method: "POST", body: { productId: product.id } });
      toast.success("Added to wishlist");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already")) {
        toast.info("Already in your wishlist");
      } else {
        toast.error(err instanceof Error ? err.message : "Could not update wishlist");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground/40">
            {product.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {discount !== null && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            -{discount}%
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <Badge variant="secondary" className="font-medium">
              Out of stock
            </Badge>
          </div>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full opacity-0 shadow transition-opacity group-hover:opacity-100"
          onClick={toggleWishlist}
          aria-label="Add to wishlist"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.brand && (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <RatingStars rating={product.rating} count={product.ratingCount} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price price={product.price} discountPrice={product.discountPrice} />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={addToCart} disabled={busy || product.stock === 0} aria-label="Add to cart">
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
