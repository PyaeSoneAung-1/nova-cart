import { NextRequest, NextResponse } from "next/server";

/**
 * Catalog proxy for /api/v1/products, /api/v1/categories and /api/v1/brands.
 *
 * The backend is a container service that scales to zero after ~5 min of idle
 * traffic (Hobby Fluid compute), so the first request after idle pays a
 * multi-second cold start. These routes are rewritten to this frontend
 * service; the handler:
 *
 *  - PUBLIC GETs (no Authorization header) are proxied to the backend over a
 *    service binding (BACKEND_URL) and cached for 300s (Next Data Cache via
 *    `next: { revalidate }`, plus CDN `s-maxage` on the response), so repeat
 *    catalog reads never touch the container;
 *  - everything else (auth'd GETs, POST/PATCH/DELETE mutations) is proxied
 *    uncached with the caller's Authorization/Cookie headers forwarded, so
 *    admin & customer mutations behave exactly as before.
 *
 * vercel.json routes only the exact public paths here — admin sub-paths such
 * as /categories/admin/list still go straight to the backend.
 */

const BACKEND =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ??
  "http://localhost:4000";

/** How long public catalog responses are cached (matches backend s-maxage). */
export const CATALOG_REVALIDATE = 300;

export async function proxyApi(req: NextRequest, apiPath: string) {
  const isPublicGet = req.method === "GET" && !req.headers.get("authorization");

  // Forward the caller's auth/cookie/content headers so protected endpoints
  // and mutations behave exactly as if they hit the backend directly.
  const upstreamHeaders: Record<string, string> = {};
  const authorization = req.headers.get("authorization");
  const cookie = req.headers.get("cookie");
  const contentType = req.headers.get("content-type");
  if (authorization) upstreamHeaders.authorization = authorization;
  if (cookie) upstreamHeaders.cookie = cookie;
  if (contentType) upstreamHeaders["content-type"] = contentType;

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const upstream = await fetch(`${BACKEND}${apiPath}${req.nextUrl.search}`, {
      method: req.method,
      headers: upstreamHeaders,
      body,
      ...(isPublicGet ? { next: { revalidate: CATALOG_REVALIDATE } } : { cache: "no-store" }),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        ...(isPublicGet
          ? {
              "cache-control": `public, s-maxage=${CATALOG_REVALIDATE}, stale-while-revalidate=300`,
              "x-catalog-proxy": "nova-cart-frontend",
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Service temporarily unavailable" },
      { status: 503 },
    );
  }
}
