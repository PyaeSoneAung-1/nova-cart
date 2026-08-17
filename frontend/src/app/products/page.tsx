"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Brand, Category, Paginated, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Top rated" },
  { value: "popular", label: "Most popular" },
];

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);

  const query = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString());
    return q.toString();
  }, [searchParams]);

  const { data, isLoading } = useSWR<Paginated<Product>>(`/products?${query}`);

  const { data: categories } = useSWR<Category[]>("/categories");
  const { data: brands } = useSWR<Brand[]>("/brands");

  const sp = searchParams;
  const search = sp.get("search") ?? "";
  const category = sp.get("category") ?? "";
  const brand = sp.get("brand") ?? "";
  const minPrice = sp.get("minPrice") ?? "";
  const maxPrice = sp.get("maxPrice") ?? "";
  const rating = sp.get("rating") ?? "";
  const inStock = sp.get("inStock") === "true";
  const sort = sp.get("sort") ?? "newest";
  const page = Number(sp.get("page") ?? "1");

  const updateParams = (updates: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") q.delete(key);
      else q.set(key, value);
    }
    q.set("page", "1");
    router.push(`/products?${q.toString()}`);
  };

  const hasFilters =
    Boolean(search) || Boolean(category) || Boolean(brand) || Boolean(minPrice) || Boolean(maxPrice) || Boolean(rating) || inStock;

  const clearFilters = () => router.push("/products");

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Clear all
          </Button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</Label>
        <div className="space-y-1">
          <label className={cn("flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted", !category && "bg-muted font-medium")}>
            <span>All categories</span>
            <input type="radio" name="category" checked={!category} onChange={() => updateParams({ category: null })} className="sr-only" />
          </label>
          {categories?.map((c) => (
            <label key={c.id} className={cn("flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted", category === c.slug && "bg-muted font-medium")}>
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c._count?.products ?? ""}</span>
              <input type="radio" name="category" checked={category === c.slug} onChange={() => updateParams({ category: c.slug })} className="sr-only" />
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Brand */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand</Label>
        <Select value={brand || "all"} onValueChange={(v) => updateParams({ brand: v === "all" ? null : v })}>
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands?.map((b) => (
              <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price range</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => updateParams({ minPrice: e.target.value || null })}
            className="h-9 text-sm"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => updateParams({ maxPrice: e.target.value || null })}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Rating */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating</Label>
        {[4, 3, 2].map((r) => (
          <label key={r} className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted", rating === String(r) && "bg-muted font-medium")}>
            <input
              type="radio"
              name="rating"
              checked={rating === String(r)}
              onChange={() => updateParams({ rating: String(r) })}
              className="sr-only"
            />
            <span className="text-amber-500">{"★".repeat(r)}</span>
            <span className="text-muted-foreground">& up</span>
          </label>
        ))}
        {rating && (
          <button onClick={() => updateParams({ rating: null })} className="px-2 text-xs text-primary hover:underline">
            Clear rating
          </button>
        )}
      </div>

      <Separator />

      {/* Availability */}
      <label className="flex cursor-pointer items-center gap-2 px-2 text-sm">
        <Checkbox
          checked={inStock}
          onCheckedChange={(v) => updateParams({ inStock: v ? "true" : null })}
        />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Shop all products</h1>
        <p className="mt-1 text-muted-foreground">
          {data ? `${data.meta.total} product${data.meta.total === 1 ? "" : "s"}` : "Browsing the catalog"}
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileFilters((v) => !v)}>
          <Filter className="mr-1.5 h-4 w-4" /> Filters {hasFilters && "(active)"}
        </Button>
        {search && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
            <Search className="h-3 w-3" /> “{search}”
            <button onClick={() => updateParams({ search: null })} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {mobileFilters && (
        <div className="mb-6 rounded-xl border bg-card p-4 lg:hidden">{filterPanel}</div>
      )}

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border bg-card p-5">{filterPanel}</div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {/* Search + sort row */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                defaultValue={search}
                placeholder="Search products…"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateParams({ search: (e.target as HTMLInputElement).value });
                }}
                onBlur={(e) => updateParams({ search: e.target.value })}
              />
            </div>
            <Select value={sort} onValueChange={(v) => updateParams({ sort: v })}>
              <SelectTrigger className="h-9 w-full sm:w-52">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : data && data.items.length > 0 ? (
            <>
              <ProductGrid products={data.items} />
              {data.meta.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (data.meta.hasPrevPage) updateParams({ page: String(page - 1) });
                          }}
                          aria-disabled={!data.meta.hasPrevPage}
                          className={!data.meta.hasPrevPage ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: data.meta.totalPages }).slice(0, 7).map((_, i) => {
                        const p = i + 1;
                        if (data.meta.totalPages > 7 && p > 3 && p < data.meta.totalPages - 2) {
                          if (p === 4) return <PaginationEllipsis key={p} />;
                          return null;
                        }
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={(e) => {
                                e.preventDefault();
                                updateParams({ page: String(p) });
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (data.meta.hasNextPage) updateParams({ page: String(page + 1) });
                          }}
                          aria-disabled={!data.meta.hasNextPage}
                          className={!data.meta.hasNextPage ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40" />
              <h3 className="font-semibold">No products found</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or filters, or browse the full catalog.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <ProductsPageInner />
    </Suspense>
  );
}
