// src/utils/axiosInstance.js
import axios from "axios";
import { getCsrfToken, clearCsrfToken } from "./csrf";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://knockoutcodes.onrender.com/api/v1";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getCookie(name) {
  try {
    if (typeof document === "undefined") return "";

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escaped}=([^;]*)`),
    );

    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getFingerprint() {
  try {
    if (
      typeof navigator === "undefined" ||
      typeof screen === "undefined" ||
      typeof Intl === "undefined"
    ) {
      return "unknown";
    }

    return [
      navigator.userAgent || "unknown",
      navigator.language || "unknown",
      screen.width || "unknown",
      screen.height || "unknown",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    ].join("|");
  } catch {
    return "unknown";
  }
}

const unsafeMethods = new Set(["post", "put", "patch", "delete"]);

let refreshPromise = null;
let didBroadcastAuthFail = false;

function normalizeUrl(url = "") {
  return String(url || "").toLowerCase();
}

function isAuthEndpoint(url = "") {
  const cleanUrl = normalizeUrl(url);

  return (
    cleanUrl.includes("/auth/login") ||
    cleanUrl.includes("/auth/register") ||
    cleanUrl.includes("/auth/csrf") ||
    cleanUrl.includes("/auth/refresh") ||
    cleanUrl.includes("/auth/logout")
  );
}

function isRefreshEndpoint(url = "") {
  return normalizeUrl(url).includes("/auth/refresh");
}

function isLogoutEndpoint(url = "") {
  return normalizeUrl(url).includes("/auth/logout");
}

function broadcastAuthExpired(status, message) {
  if (didBroadcastAuthFail) return;

  didBroadcastAuthFail = true;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("kc:auth-expired", {
        detail: {
          status,
          message: message || "Session expired. Please login again.",
        },
      }),
    );
  }

  setTimeout(() => {
    didBroadcastAuthFail = false;
  }, 1500);
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post("/auth/refresh", {})
      .then((res) => {
        didBroadcastAuthFail = false;
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function isPublicPage() {
  if (typeof window === "undefined") return false;

  const p = window.location.pathname;

  return [
    "/",
    "/home",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(p);
}

axiosInstance.interceptors.request.use(
  async (config) => {
    const method = String(config.method || "get").toLowerCase();
    const isUnsafe = unsafeMethods.has(method);

    config.headers = config.headers || {};

    const storedUser =
      safeJsonParse(localStorage.getItem("user")) ||
      safeJsonParse(localStorage.getItem("userInfo")) ||
      safeJsonParse(localStorage.getItem("adminInfo"));

    const token =
      storedUser?.token ||
      storedUser?.accessToken ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-Client-Fingerprint"] = getFingerprint();

    if (isUnsafe) {
      const csrfToken = await getCsrfToken();

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
        config.headers["x-csrf-token"] = csrfToken;
      }

      config.headers["X-Request-Intent"] = "user-action";
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.code === "ECONNABORTED") {
      error.message = "Request timed out. Please try again.";
    }

    if (!error.response) {
      error.response = {
        status: 0,
        data: {
          success: false,
          message: error.message || "Network error.",
        },
      };

      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = String(error.response?.data?.message || "");
    const originalConfig = error.config || {};
    const url = normalizeUrl(originalConfig.url);

    const isCsrfFailure =
      status === 403 && !url.includes("/auth/csrf") && /csrf/i.test(message);

    if (isCsrfFailure && !originalConfig._csrfRetry) {
      try {
        clearCsrfToken();
        const csrfToken = await getCsrfToken({ force: true });

        return axiosInstance.request({
          ...originalConfig,
          _csrfRetry: true,
          headers: {
            ...(originalConfig.headers || {}),
            "X-CSRF-Token": csrfToken || getCookie("csrfToken") || "",
            "x-csrf-token": csrfToken || getCookie("csrfToken") || "",
          },
        });
      } catch {
        return Promise.reject(error);
      }
    }

    const shouldTryRefresh =
      status === 401 &&
      !originalConfig._retry &&
      !isAuthEndpoint(url) &&
      !isLogoutEndpoint(url);

    if (shouldTryRefresh) {
      try {
        await refreshSession();

        return axiosInstance.request({
          ...originalConfig,
          _retry: true,
        });
      } catch (refreshError) {
        broadcastAuthExpired(
          refreshError?.response?.status || 401,
          refreshError?.response?.data?.message ||
            "Session expired. Please login again.",
        );

        return Promise.reject(error);
      }
    }

    const shouldBroadcast =
      (status === 401 || status === 419) &&
      !isAuthEndpoint(url) &&
      !isRefreshEndpoint(url);

    if (shouldBroadcast && !isPublicPage()) {
      broadcastAuthExpired(
        status,
        message || "Session expired. Please login again.",
      );
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
