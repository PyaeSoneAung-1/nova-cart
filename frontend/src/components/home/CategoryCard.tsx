"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "@/lib/types";

/** One "Shop by category" tile — client component so the image can fall
 *  back to a monogram badge if the photo fails to load. */
export function CategoryCard({ category, hue }: { category: Category; hue: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {category.image && !imgFailed ? (
        <span className="relative h-14 w-14 overflow-hidden rounded-full ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image}
            alt={category.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </span>
      ) : (
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 60%))` }}
        >
          {category.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium leading-tight">{category.name}</span>
      <span className="text-xs text-muted-foreground">
        {category._count?.products ?? 0} products
      </span>
    </Link>
  );
}
