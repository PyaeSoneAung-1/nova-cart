import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "@/lib/proxy-catalog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyCatalogGet(req, `/api/v1/products/${encodeURIComponent(id)}/reviews`);
}
