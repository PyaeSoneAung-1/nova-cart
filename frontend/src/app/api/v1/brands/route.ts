import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/proxy-catalog";

function handler(req: NextRequest) {
  return proxyApi(req, "/api/v1/brands");
}

export const GET = handler;
export const POST = handler;
