import { useAuthStore } from "@/lib/auth-store";
import type { ApiEnvelope, ApiErrorBody } from "@/lib/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  status: number;
  errors: { field: string; message: string }[];

  constructor(status: number, message: string, errors: { field: string; message: string }[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let refreshing: Promise<boolean> | null = null;

/** Exchange the refresh token for a new access token. */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const body = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  useAuthStore.getState().setTokens(body.data.accessToken, body.data.refreshToken);
  return true;
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the automatic 401-refresh-retry loop (default false). */
  skipRetry?: boolean;
}

/**
 * Fetch wrapper: attaches the access token, parses the API envelope,
 * and transparently refreshes the access token once on 401.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, skipRetry = false, headers, ...rest } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(accessToken);

  // Token expired → try to refresh once, then retry the original request.
  if (res.status === 401 && !skipRetry) {
    refreshing = refreshing ?? refreshTokens();
    const ok = await refreshing;
    refreshing = null;
    if (ok) {
      res = await doFetch(useAuthStore.getState().accessToken);
    } else {
      useAuthStore.getState().logout();
      throw new ApiClientError(401, "Session expired. Please log in again.");
    }
  }

  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    const errorPayload = payload as ApiErrorBody | null;
    throw new ApiClientError(
      res.status,
      errorPayload?.message ?? `Request failed (${res.status})`,
      errorPayload?.errors ?? [],
    );
  }
  return payload!.data;
}

/** SWR fetcher (the leading slash is added by the caller's path). */
export const swrFetcher = <T>(path: string) => api<T>(path);
