import { useAuthStore } from "@/stores/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    total?: number;
    has_more?: boolean;
    next_cursor?: string;
  };
}

interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
}

class ApiClientError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public type: string,
  ) {
    super(detail);
    this.name = "ApiClientError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const { tokens, setTokens, logout } = useAuthStore.getState();
    if (!tokens?.refresh_token) {
      logout();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });

      if (!res.ok) {
        logout();
        return false;
      }

      const body: ApiResponse<{ access_token: string; refresh_token: string }> =
        await res.json();
      setTokens({
        access_token: body.data.access_token,
        refresh_token: body.data.refresh_token,
      });
      return true;
    } catch {
      logout();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function getAuthHeaders(): Record<string, string> {
  const { tokens } = useAuthStore.getState();
  if (tokens?.access_token) {
    return { Authorization: `Bearer ${tokens.access_token}` };
  }
  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      type: "unknown",
      title: "Request failed",
      status: res.status,
      detail: res.statusText,
    }));
    throw new ApiClientError(error.status, error.detail, error.type);
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};

export { ApiClientError, API_BASE };
export type { ApiResponse, ApiError };
