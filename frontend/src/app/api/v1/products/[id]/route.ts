import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/proxy-catalog";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyApi(req, `/api/v1/products/${encodeURIComponent(id)}`);
}

export const GET = handler;
export const PATCH = handler;
export const DELETE = handler;
