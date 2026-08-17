import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <AdminShell>
      <ProductForm />
    </AdminShell>
  );
}
