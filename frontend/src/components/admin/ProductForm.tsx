"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, swrFetcher } from "@/lib/api";
import type { Brand, Category, Product } from "@/lib/types";

interface VariantDraft {
  sku: string;
  size: string;
  color: string;
  price: string;
  stock: string;
}

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const { data: categories } = useSWR<Category[]>("/categories/admin/list", swrFetcher);
  const { data: brands } = useSWR<Brand[]>("/brands/admin/list", swrFetcher);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [discountPrice, setDiscountPrice] = useState(product?.discountPrice !== null && product?.discountPrice !== undefined ? String(product.discountPrice) : "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [imageUrl, setImageUrl] = useState(product?.images[0]?.url ?? "");
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map((v) => ({
      sku: v.sku,
      size: v.size ?? "",
      color: v.color ?? "",
      price: v.price !== null && v.price !== undefined ? String(v.price) : "",
      stock: String(v.stock),
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name,
        description,
        price: Number(price),
        discountPrice: discountPrice !== "" ? Number(discountPrice) : undefined,
        sku,
        stock: Number(stock) || 0,
        categoryId,
        brandId: brandId || null,
        isPublished,
        images: imageUrl ? [{ url: imageUrl, alt: name, sortOrder: 0 }] : [],
        variants: variants
          .filter((v) => v.sku.trim())
          .map((v) => ({
            sku: v.sku,
            size: v.size || undefined,
            color: v.color || undefined,
            price: v.price !== "" ? Number(v.price) : undefined,
            stock: Number(v.stock) || 0,
          })),
      };

      if (isEdit) {
        await api(`/products/${product!.id}`, { method: "PATCH", body: payload });
        toast.success("Product updated");
      } else {
        await api("/products", { method: "POST", body: payload });
        toast.success("Product created");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="Back">
            <a href="/admin/products">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <h2 className="text-xl font-bold">{isEdit ? "Edit product" : "New product"}</h2>
        </div>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name *</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description *</Label>
              <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Describe the product…" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-image">Image URL</Label>
              <Input id="p-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
              <p className="text-xs text-muted-foreground">
                Leave empty to use an auto-generated placeholder.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing & stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Price (USD) *</Label>
              <Input id="p-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-discount">Discount price</Label>
              <Input id="p-discount" type="number" min="0" step="0.01" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU *</Label>
              <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="NC-0001" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">Stock *</Label>
              <Input id="p-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isPublished} onCheckedChange={(v) => setIsPublished(v === true)} />
              Published (visible to customers)
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId || "none"} onValueChange={(v) => setBrandId((v ?? "none") === "none" ? "" : v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No brand</SelectItem>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Variants ({variants.length})</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants([...variants, { sku: "", size: "", color: "", price: "", stock: "0" }])}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.length === 0 && (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No variants — the product will use its base price and stock.
            </p>
          )}
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-6">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input value={v.sku} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} placeholder="VAR-SKU" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Input value={v.color} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} placeholder="Black" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Size</Label>
                <Input value={v.size} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} placeholder="M" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price</Label>
                <Input type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="Optional" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" min="0" value={v.stock} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label="Remove variant">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}
