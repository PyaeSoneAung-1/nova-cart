"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { Skeleton } from "@/components/ui/skeleton";
import { swrFetcher } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | undefined>();

  useEffect(() => {
    let cancelled = false;
    swrFetcher<Product>(`/products/admin/${params.id}`)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!product) {
    return (
      <AdminShell>
        <Skeleton className="h-96 rounded-xl" />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <ProductForm product={product} />
    </AdminShell>
  );
}
