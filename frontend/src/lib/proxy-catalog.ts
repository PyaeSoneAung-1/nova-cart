import { NextRequest, NextResponse } from "next/server";

/**
 * Catalog proxy for public GET endpoints.
 *
 * The backend is a container service that scales to zero after ~5 min of idle
 * traffic (Hobby Fluid compute), so the first request after idle pays a
 * multi-second cold start. To keep browsing fast, the frontend service serves
 * the public catalog GETs itself and caches them:
 *
 *  - the upstream response is stored in the Next.js Data Cache
 *    (`next: { revalidate }`), keyed by the full URL (incl. query string);
 *  - the handler response is also CDN-cached (`s-maxage`), so repeat
 *    requests never reach a function at all.
 *
 * Only no-auth GETs are routed here (see vercel.json rewrites). Requests
 * carrying an `Authorization` header — e.g. admin list endpoints — still go
 * straight to the backend, so nothing auth-dependent is ever cached.
 */

const BACKEND =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ??
  "http://localhost:4000";

/** How long catalog responses are cached (matches backend s-maxage=300). */
export const CATALOG_REVALIDATE = 300;

export async function proxyCatalogGet(req: NextRequest, apiPath: string) {
  try {
    const upstream = await fetch(`${BACKEND}${apiPath}${req.nextUrl.search}`, {
      next: { revalidate: CATALOG_REVALIDATE },
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": `public, s-maxage=${CATALOG_REVALIDATE}, stale-while-revalidate=300`,
        "x-catalog-proxy": "nova-cart-frontend",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Catalog temporarily unavailable" },
      { status: 503 },
    );
  }
}
