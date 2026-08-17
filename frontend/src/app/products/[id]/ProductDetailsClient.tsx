"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Heart, Minus, Plus, ShieldCheck, ShoppingCart, Truck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Cart, Paginated, Product, Review } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/product/RatingStars";
import { Price } from "@/components/product/Price";
import { discountPercent, formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import { placeholderImage } from "@/lib/placeholder";

export function ProductDetailsClient({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? product.price;
  const discountPrice = product.discountPrice;
  const stock = variant ? variant.stock : product.stock;
  const discount = discountPercent(product);
  const image = product.images[0]?.url ?? placeholderImage(product.name, product.slug);

  const { data: reviewsData, mutate: mutateReviews } = useSWR<Paginated<Review>>(
    `/products/${product.id}/reviews?limit=50`,
  );
  const reviews = reviewsData?.items ?? [];

  const addToCart = async () => {
    if (!user) {
      toast.info("Please sign in to add items to your cart");
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await api("/cart/items", {
        method: "POST",
        body: { productId: product.id, variantId: variantId ?? undefined, quantity },
      });
      const cart = await api<Cart>("/cart");
      useCartStore.getState().setCart(cart);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast.info("Please sign in to use your wishlist");
      router.push("/login");
      return;
    }
    try {
      await api("/wishlist/items", { method: "POST", body: { productId: product.id } });
      toast.success("Added to wishlist");
    } catch (err) {
      toast.info(err instanceof Error ? err.message : "Wishlist updated");
    }
  };

  const specs = useMemo(() => {
    const rows: [string, string][] = [["SKU", product.sku], ["Category", product.category?.name ?? "—"]];
    if (product.brand) rows.push(["Brand", product.brand.name]);
    rows.push(["Availability", stock > 0 ? `In stock (${stock})` : "Out of stock"]);
    rows.push(["Rating", `${Number(product.rating).toFixed(1)} / 5 (${product.ratingCount} reviews)`]);
    return rows;
  }, [product, stock]);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
            {discount !== null && (
              <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground">-{discount}%</Badge>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img) => (
                <div key={img.id} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? product.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          {product.brand && (
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{product.brand.name}</span>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <RatingStars rating={Number(product.rating)} count={product.ratingCount} size="md" />

          <Price price={price} discountPrice={discountPrice} size="lg" />
          {discount !== null && (
            <p className="text-sm text-muted-foreground">
              You save <span className="font-semibold text-primary">{formatPrice(product.price - (product.discountPrice ?? product.price))}</span> today
            </p>
          )}

          <p className="leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <span className="mb-2 block text-sm font-medium">Options</span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVariantId(v.id);
                      setQuantity(1);
                    }}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm transition-colors",
                      variantId === v.id
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "hover:border-primary/40",
                      v.stock === 0 && "opacity-40",
                    )}
                  >
                    {[v.color, v.size].filter(Boolean).join(" · ")}
                    {v.stock === 0 && " (sold out)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border">
              <button
                className="p-2.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                className="p-2.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
                disabled={quantity >= stock}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button size="lg" className="flex-1 rounded-full sm:flex-none sm:px-8" onClick={addToCart} disabled={busy || stock === 0}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {stock === 0 ? "Out of stock" : "Add to cart"}
            </Button>

            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full" onClick={toggleWishlist} aria-label="Add to wishlist">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <p className={cn("text-sm font-medium", stock > 0 ? "text-emerald-600" : "text-destructive")}>
            {stock > 0 ? `${stock} in stock — ready to ship` : "Currently out of stock"}
          </p>

          {/* Trust */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/40 p-4 text-center text-xs">
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-medium">Free over $50</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Secure checkout</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-medium">14-day returns</span>
            </div>
          </div>

          {/* Specs */}
          <div className="rounded-xl border">
            {specs.map(([k, v], i) => (
              <div key={k} className={cn("flex justify-between px-4 py-2.5 text-sm", i % 2 === 1 && "bg-muted/40")}>
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 grid gap-10 lg:grid-cols-3">
        <div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Customer reviews</h2>
          <div className="flex items-center gap-4 rounded-xl border p-5">
            <span className="text-5xl font-bold">{Number(product.rating).toFixed(1)}</span>
            <div>
              <RatingStars rating={Number(product.rating)} size="md" />
              <p className="mt-1 text-sm text-muted-foreground">Based on {product.ratingCount} reviews</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {user && (
            <ReviewForm productId={product.id} onDone={() => mutateReviews()} />
          )}

          <div className="mt-6 space-y-4">
            {reviews.length === 0 && (
              <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                No reviews yet — be the first to share your experience.
              </p>
            )}
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {review.user?.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{review.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  {review.isVerifiedPurchase && (
                    <Badge variant="secondary" className="text-xs">Verified purchase</Badge>
                  )}
                </div>
                <RatingStars rating={review.rating} />
                {review.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [hovered, setHovered] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 3) {
      toast.error("Please write a short comment (at least 3 characters)");
      return;
    }
    setBusy(true);
    try {
      await api(`/products/${productId}/reviews`, {
        method: "POST",
        body: { rating, comment: comment.trim() },
      });
      toast.success("Review submitted — thank you!");
      setComment("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">Write a review</h3>
      <div className="mb-3 flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRating(r)}
            onMouseEnter={() => setHovered(r)}
            className="text-2xl transition-colors"
            aria-label={`${r} stars`}
          >
            <span className={r <= (hovered || rating) ? "text-amber-400" : "text-zinc-300"}>★</span>
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product…"
        rows={3}
      />
      <Button type="submit" size="sm" className="mt-3" disabled={busy}>
        Submit review
      </Button>
    </form>
  );
}
