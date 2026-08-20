import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "@/lib/proxy-catalog";

export async function GET(req: NextRequest) {
  return proxyCatalogGet(req, "/api/v1/categories");
}
