import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  AxiosError,
} from "axios";

// Standard API envelope used by every route in this project
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
  message?: string;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = typeof window !== "undefined"
  ? ""
  : (process.env.NEXT_PUBLIC_BASE_URL ?? "");

// ─── Envelope interceptor ────────────────────────────────────────────────────
// Unwraps { success, data, error } and normalises errors so callers get a
// plain Error with a readable message.

function applyEnvelopeInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (res: AxiosResponse<ApiResponse>) => {
      if (res.data?.success === false) {
        return Promise.reject(new Error(res.data.error ?? "Request failed"));
      }
      return res;
    },
    (err: AxiosError<ApiResponse>) => {
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        err.message ??
        "An unexpected error occurred";
      return Promise.reject(new Error(message));
    }
  );
}

// ─── Refresh queue ────────────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh calls when several requests 401 at once.

type RetryRequest = () => void;

let isRefreshing   = false;
let refreshQueue: RetryRequest[] = [];

function flushQueue(): void {
  refreshQueue.forEach((resolve) => resolve());
  refreshQueue = [];
}

function abortQueue(): void {
  refreshQueue = [];
}

// ─── apiClient ───────────────────────────────────────────────────────────────
// Cookie-authenticated client (withCredentials: true).
// Automatically retries once after a silent token refresh on 401.

export const apiClient: AxiosInstance = axios.create({
  baseURL:         BASE_URL,
  headers:         { "Content-Type": "application/json" },
  withCredentials: true,
});

// Envelope unwrapping + 401 → refresh → retry
apiClient.interceptors.response.use(
  (res: AxiosResponse<ApiResponse>) => {
    if (res.data?.success === false) {
      return Promise.reject(new Error(res.data.error ?? "Request failed"));
    }
    return res;
  },
  async (err: AxiosError<ApiResponse>) => {
    type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
    const original = err.config as RetryConfig | undefined;

    // On 401, attempt a single token refresh — but never for the refresh
    // endpoint itself (would cause an infinite loop).
    if (
      err.response?.status === 401 &&
      original &&
      !original._retry &&
      original.url !== "/api/auth/refresh"
    ) {
      original._retry = true;

      if (isRefreshing) {
        // Another request already kicked off a refresh — wait for it.
        return new Promise<AxiosResponse>((resolve) => {
          refreshQueue.push(() => resolve(apiClient(original)));
        });
      }

      isRefreshing = true;
      try {
        // POST /api/auth/refresh — sends the refresh_token cookie automatically
        // because withCredentials is true on the base axios instance.
        await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        flushQueue();
        return apiClient(original);
      } catch {
        abortQueue();
        // Refresh token is invalid or expired — redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(new Error("Session expired. Please log in again."));
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      err.message ??
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

// ─── authClient ───────────────────────────────────────────────────────────────
// Returns an Axios instance pre-configured with a Bearer token.
// Use this in every service function that requires authentication.
//
// Note: authClient instances do not include the refresh interceptor because
// the token is managed externally (e.g. Zustand store). On 401, the calling
// code should call POST /api/auth/refresh to obtain a new token and retry.
//
// Example:
//   const client = authClient(token);
//   const res = await client.get<ApiResponse<Product[]>>("/api/vendor/products");

export function authClient(token: string): AxiosInstance {
  const instance = axios.create({
    baseURL:  BASE_URL,
    headers:  {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    withCredentials: true,
  });

  applyEnvelopeInterceptor(instance);
  return instance;
}

// Re-export AxiosError so consumers don't need a separate import
export { AxiosError };

// Keep a request-config type alias for convenience
export type { InternalAxiosRequestConfig };
