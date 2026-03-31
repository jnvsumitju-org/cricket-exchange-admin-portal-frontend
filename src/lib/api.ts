const DEFAULT_API = "http://localhost:4000";

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? DEFAULT_API;
}

/** Optional cricket mock / data service base URL (no trailing slash). */
export function getCricketDataBase(): string | null {
  const u = process.env.NEXT_PUBLIC_CRICKET_DATA_URL?.trim().replace(/\/$/, "");
  return u && u.length > 0 ? u : null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; idempotencyKey?: string | null } = {}
): Promise<T> {
  const { token, idempotencyKey, headers: hdr, ...rest } = options;
  const headers = new Headers(hdr);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (idempotencyKey?.trim()) {
    headers.set("Idempotency-Key", idempotencyKey.trim());
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    ...rest,
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: string }).error)
        : res.statusText;
    throw new ApiError(msg || "Request failed", res.status, data);
  }

  return data as T;
}
