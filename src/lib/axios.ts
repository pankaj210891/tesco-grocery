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

// Base client — no auth header; used for public routes and cookie-authenticated calls
export const apiClient: AxiosInstance = axios.create({
  baseURL: typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_BASE_URL ?? ""),
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send auth_token cookie on every request
});

// Response interceptor — unwraps the { success, data, error } envelope and
// normalises errors so callers get a plain Error with a readable message.
apiClient.interceptors.response.use(
  (res: AxiosResponse<ApiResponse>) => {
    if (res.data && res.data.success === false) {
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

/**
 * Returns an Axios instance pre-configured with a Bearer token.
 * Use this in every service function that requires authentication.
 *
 * Example:
 *   const client = authClient(token);
 *   const res = await client.get<ApiResponse<Product[]>>("/api/vendor/products");
 */
export function authClient(token: string): AxiosInstance {
  const instance = axios.create({
    baseURL: typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_BASE_URL ?? ""),
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    withCredentials: true,
  });

  // Apply the same envelope-unwrapping interceptor
  instance.interceptors.response.use(
    (res: AxiosResponse<ApiResponse>) => {
      if (res.data && res.data.success === false) {
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

  return instance;
}

// Re-export AxiosError so consumers don't need a separate import
export { AxiosError };

// Keep a request-config type alias for convenience
export type { InternalAxiosRequestConfig };
