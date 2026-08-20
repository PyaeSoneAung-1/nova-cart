import Link from "next/link";
import { ArrowRight, Sparkles, Truck, ShieldCheck, RotateCcw, BadgePercent } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { HomeCta } from "@/components/home/HomeCta";
import { CategoryCard } from "@/components/home/CategoryCard";
import { API_URL } from "@/lib/api";
import type { Category, Paginated, Product } from "@/lib/types";

async function fetchProducts(query: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products?limit=8&${query}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body.data as Paginated<Product>).items;
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const body = await res.json();
    return body.data as Category[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, newArrivals, popular, categories] = await Promise.all([
    fetchProducts("sort=rating-desc"),
    fetchProducts("sort=newest"),
    fetchProducts("sort=popular"),
    fetchCategories(),
  ]);

  const activeCategories = categories.filter((c) => c.isActive !== false).slice(0, 6);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-zinc-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url(/images/hero.webp)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-24 sm:px-6 lg:py-32">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-sm font-medium text-violet-300">
              <Sparkles className="h-4 w-4" />
              New season · Up to 40% off
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                delivered with care
              </span>
            </h1>
            <p className="text-lg leading-relaxed text-zinc-300">
              Curated electronics, fashion, home and lifestyle — with fast checkout,
              secure mock payments and order tracking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/products">
                  Shop now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-zinc-700 bg-transparent px-8 text-white hover:bg-zinc-900 hover:text-white">
                <Link href="/products?sort=newest">New arrivals</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────────────────── */}
      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Free shipping", text: "On orders over $50" },
            { icon: ShieldCheck, title: "Secure checkout", text: "Mock payment flow" },
            { icon: RotateCcw, title: "Easy returns", text: "14-day returns" },
            { icon: BadgePercent, title: "Coupons", text: "WELCOME10 for 10% off" },
          ].map((perk) => (
            <div key={perk.title} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <perk.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured products</h2>
            <p className="mt-1 text-muted-foreground">Top-rated picks our customers love</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/products?sort=rating-desc">
              View all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ProductGrid products={featured} />
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {activeCategories.length > 0 && (
        <section className="bg-muted/40 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Shop by category</h2>
                <p className="mt-1 text-muted-foreground">Browse our collections</p>
              </div>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/products">
                  All categories <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {activeCategories.map((category, i) => (
                <CategoryCard key={category.id} category={category} hue={(i * 47) % 360} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Promo banner ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: "url(/images/promo.webp)" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" aria-hidden />
          <div className="relative flex flex-col items-start gap-4 px-8 py-16 sm:px-12 lg:px-16">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              Limited time
            </span>
            <h2 className="max-w-md text-3xl font-bold text-white sm:text-4xl">
              Summer essentials — save up to 25% with code{" "}
              <span className="text-violet-300">SAVE15</span>
            </h2>
            <p className="max-w-md text-zinc-300">
              Home, fitness and beauty favorites restocked. Free shipping over $50.
            </p>
            <Button asChild size="lg" className="mt-2 rounded-full px-8">
              <Link href="/products">
                Shop the sale <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── New arrivals ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">New arrivals</h2>
            <p className="mt-1 text-muted-foreground">Fresh drops, updated weekly</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/products?sort=newest">
              View all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ProductGrid products={newArrivals} />
      </section>

      {/* ── Popular ──────────────────────────────────────────────────────── */}
      <section className="bg-muted/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Popular right now</h2>
              <p className="mt-1 text-muted-foreground">Most-bought products this week</p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/products?sort=popular">
                View all <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ProductGrid products={popular} />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <HomeCta />
    </div>
  );
}
