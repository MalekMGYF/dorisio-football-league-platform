import { cacheGet, cacheSet } from "@/lib/client/offline";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** When offline, GET requests fall back to this cached key. */
  cacheKey?: string;
  /** Seconds a successful GET may be served from cache. */
  cacheTtl?: number;
}

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, cacheKey, cacheTtl = 60 * 60 * 24 } = options;

  if (method === "GET" && cacheKey) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached && Date.now() - cached.savedAt < cacheTtl * 1000 && offline()) {
      return cached.value;
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    if (method === "GET" && cacheKey) {
      const cached = await cacheGet<T>(cacheKey);
      if (cached) return cached.value;
    }
    throw new ApiClientError(
      "تعذّر الاتصال بالخادم. تحقق من الشبكة وأعد المحاولة.",
      "network",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiClientError(
      error?.message ?? "حدث خطأ غير متوقع. حاول مرة أخرى.",
      error?.code ?? "server_error",
      response.status,
    );
  }

  if (method === "GET" && cacheKey) {
    void cacheSet(cacheKey, payload);
  }

  return payload as T;
}

export async function apiOrOffline<T>(path: string, cacheKey: string): Promise<T> {
  try {
    return await api<T>(path, { cacheKey });
  } catch (error) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) return cached.value;
    throw error;
  }
}
