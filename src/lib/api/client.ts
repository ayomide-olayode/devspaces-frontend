import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./endpoints";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/hooks/useToast";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token if present
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("devspace_token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle session expiration (401), refresh token, and error formatting
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Check if error is 401 Unauthorized and request has not already been retried
    if (error.response.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("devspace_refresh_token")
          : null;

      // If no refresh token exists, perform full logout
      if (!refreshToken) {
        useAuthStore.getState().logout();
        toast.error("Session expired. Please sign in again.");
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
          window.location.href = "/auth/sign-in";
        }
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{
          accessToken?: string;
          token?: string;
          refreshToken?: string;
        }>(`${API_BASE_URL}/api/Auth/refresh-token`, { refreshToken });

        const newAccessToken = response.data.accessToken || response.data.token;
        const newRefreshToken = response.data.refreshToken;

        if (!newAccessToken) {
          throw new Error("No access token received from refresh endpoint");
        }

        // Update tokens in Zustand & localStorage
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        // Update default header and original request header
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Replay all waiting queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original failed request
        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        // If refresh token fails (expired/revoked), log the user out
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        toast.error("Session expired. Please sign in again.");

        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
          window.location.href = "/auth/sign-in";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const extractedMessage = getApiErrorMessage(error);
    if (extractedMessage) {
      error.message = extractedMessage;
    }

    return Promise.reject(error);
  },
);
