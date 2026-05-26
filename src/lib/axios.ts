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

// ─── Refresh queue (apiClient) ────────────────────────────────────────────────
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

// ─── Refresh queue (authClient) ───────────────────────────────────────────────
// Separate queue for Bearer-token clients so they don't collide with apiClient.

let isRefreshingAuth = false;
let authRefreshQueue: Array<(newToken: string) => void> = [];

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
// Includes a refresh interceptor: on 401, silently calls /api/auth/refresh,
// writes the new token back to the Zustand auth store (via dynamic import to
// avoid a circular dependency), then retries the original request.

export function authClient(token: string): AxiosInstance {
  const instance = axios.create({
    baseURL:  BASE_URL,
    headers:  {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    withCredentials: true,
  });

  instance.interceptors.response.use(
    (res: AxiosResponse<ApiResponse>) => {
      if (res.data?.success === false) {
        return Promise.reject(new Error(res.data.error ?? "Request failed"));
      }
      return res;
    },
    async (err: AxiosError<ApiResponse>) => {
      type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
      const original = err.config as RetryConfig | undefined;

      if (
        err.response?.status === 401 &&
        original &&
        !original._retry
      ) {
        original._retry = true;

        if (isRefreshingAuth) {
          // Queue this request until the in-flight refresh completes.
          return new Promise<AxiosResponse>((resolve, reject) => {
            authRefreshQueue.push((newToken: string) => {
              if (original.headers) {
                original.headers["Authorization"] = `Bearer ${newToken}`;
              }
              instance(original).then(resolve).catch(reject);
            });
          });
        }

        isRefreshingAuth = true;
        try {
          const refreshRes = await axios.post(
            `${BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          );
          const newToken = refreshRes.data?.data?.token as string | undefined;
          if (!newToken) throw new Error("No token in refresh response");

          // Dynamic import breaks the circular dep: store → axios → store.
          // At call time (not module init) this is fully resolved.
          const { useAuthStore } = await import("@/store/auth.store");
          const { user, setAuth } = useAuthStore.getState();
          if (user) setAuth(user, newToken);

          // Flush queued requests with the new token
          authRefreshQueue.forEach((cb) => cb(newToken));
          authRefreshQueue = [];

          if (original.headers) {
            original.headers["Authorization"] = `Bearer ${newToken}`;
          }
          return instance(original);
        } catch {
          authRefreshQueue = [];
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(new Error("Session expired. Please log in again."));
        } finally {
          isRefreshingAuth = false;
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

  return instance;
}

// Re-export AxiosError so consumers don't need a separate import
export { AxiosError };

// Keep a request-config type alias for convenience
export type { InternalAxiosRequestConfig };
