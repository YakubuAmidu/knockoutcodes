// /src/lib/apiClient.js
import axios from "axios";
import { getCsrfToken, clearCsrfToken } from "../../utils/csrf";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL &&
    String(import.meta.env.VITE_API_BASE_URL).trim()) ||
  "https://knockoutcodes.onrender.com/api/v1";

// function getCookie(name) {
//   if (typeof document === "undefined") return "";

//   const value = `; ${document.cookie}`;
//   const parts = value.split(`; ${name}=`);

//   if (parts.length === 2) {
//     return decodeURIComponent(parts.pop().split(";").shift());
//   }

//   return "";
// }

function getStoredToken() {
  if (typeof window === "undefined") return "";

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("accessToken") ||
    "";

  if (
    token &&
    typeof token === "string" &&
    token !== "undefined" &&
    token !== "null" &&
    token.trim().length > 20
  ) {
    return token.trim();
  }

  return "";
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const method = String(config.method || "get").toUpperCase();
    const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (unsafeMethods.includes(method)) {
      const csrfToken = await getCsrfToken();

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
        config.headers["x-csrf-token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || "").toLowerCase();
    const originalRequest = error?.config;

    const isCsrfError =
      status === 403 &&
      message.includes("csrf") &&
      originalRequest &&
      !originalRequest._csrfRetried;

    if (isCsrfError) {
      originalRequest._csrfRetried = true;
      clearCsrfToken();
      const freshToken = await getCsrfToken({ force: true });

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers["X-CSRF-Token"] = freshToken;
      originalRequest.headers["x-csrf-token"] = freshToken;

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

export function setAuthToken(token) {
  const t =
    token &&
    typeof token === "string" &&
    token !== "undefined" &&
    token !== "null"
      ? token.trim()
      : "";

  if (t.length > 20) {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;

    if (typeof window !== "undefined") {
      localStorage.setItem("token", t);
    }

    return;
  }

  delete api.defaults.headers.common.Authorization;

  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("accessToken");
  }
}

let _unauthorizedInterceptorId = null;

export function attach401Handler(onUnauthorized) {
  if (typeof onUnauthorized !== "function") return;

  if (_unauthorizedInterceptorId !== null) {
    api.interceptors.response.eject(_unauthorizedInterceptorId);
    _unauthorizedInterceptorId = null;
  }

  _unauthorizedInterceptorId = api.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error?.response?.status === 401) {
        try {
          onUnauthorized();
        } catch {
          // ignore
        }
      }

      return Promise.reject(error);
    },
  );
}

export async function getAllTestimonials() {
  const { data } = await api.get("/testimonials");

  if (Array.isArray(data?.testimonials)) return data.testimonials;
  if (Array.isArray(data)) return data;

  return [];
}

async function postCheckout(path, payload) {
  const { data } = await api.post(path, payload);

  if (!data?.url) {
    throw new Error("Checkout URL missing from server response.");
  }

  return data;
}

function enhanceCheckoutError(error) {
  const data = error?.response?.data;

  if (error?.response?.status === 409 && data?.noNewValue) {
    error.message =
      data.message ||
      "This membership does not add new access to your account.";
  }

  if (error?.response?.status === 409 && data?.alreadySubscribed) {
    error.message =
      data.message || "You are already subscribed to this membership.";
  }

  if (error?.response?.status === 409 && data?.alreadyAccessible) {
    error.message =
      data.message || "You already have access through your membership.";
  }

  return error;
}

export async function createProductCheckoutSession(items) {
  const safeItems = Array.isArray(items) ? items : [];

  return postCheckout("/checkout/products", {
    items: safeItems,
  });
}

export async function getMemberships(params = "") {
  const q = String(params || "").trim();
  const { data } = await api.get(`/memberships${q ? `?${q}` : ""}`);

  const list = data?.data ?? data?.memberships ?? data;

  return Array.isArray(list) ? list : [];
}

export async function getMembershipById(id) {
  const safe = encodeURIComponent(String(id || ""));
  const { data } = await api.get(`/memberships/${safe}`);

  return data?.data ?? data?.membership ?? data;
}

export async function createMembershipCheckoutSession(payload) {
  try {
    const { data } = await api.post("/subscriptions/checkout", payload);

    if (!data?.url) {
      throw new Error("Checkout URL missing from server response.");
    }

    return data;
  } catch (error) {
    throw enhanceCheckoutError(error);
  }
}

export async function getMySubscription(options = {}) {
  const { signal } = options || {};

  const { data } = await api.get("/subscriptions/me", {
    signal,
    params: {
      t: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return data?.data ?? data?.subscription ?? data;
}

export async function confirmCheckoutSession(sessionId, options = {}) {
  const safe = encodeURIComponent(String(sessionId || ""));
  const bust = Date.now();
  const { signal } = options || {};

  const { data } = await api.get(
    `/subscriptions/confirm?session_id=${safe}&t=${bust}`,
    {
      signal,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
  );

  return data;
}

export async function switchMembershipPlan(payload) {
  try {
    const { data } = await api.patch("/subscriptions/switch", payload);
    return data?.data ?? data;
  } catch (error) {
    throw enhanceCheckoutError(error);
  }
}

export async function cancelMyMembership() {
  const { data } = await api.patch("/subscriptions/cancel");
  return data?.data ?? data;
}

export async function confirmProductCheckoutSession(sessionId, options = {}) {
  const safe = encodeURIComponent(String(sessionId || ""));
  const bust = Date.now();
  const { signal } = options || {};

  const { data } = await api.get(
    `/orders/confirm-product?session_id=${safe}&t=${bust}`,
    {
      signal,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
  );

  return data;
}

export async function getMyOrders(params = {}) {
  const { signal, ...safeParams } = params || {};

  const { data } = await api.get("/orders/my", {
    signal,
    params: {
      ...safeParams,
      t: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return data;
}

export async function getAdminOrders(params = {}) {
  const { data } = await api.get("/orders", { params });
  return data;
}

export async function getAdminOrder(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.get(`/orders/${safeId}`);
  return data;
}

export async function updateAdminOrder(id, payload = {}) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.put(`/orders/${safeId}`, payload);
  return data;
}

export async function deleteAdminOrder(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.delete(`/orders/${safeId}`);
  return data;
}

export async function markAdminOrderSeen(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/seen`);
  return data;
}

export async function fulfillAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/fulfill`, { note });
  return data;
}

export async function cancelAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/cancel`, { note });
  return data;
}

export async function refundAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/refund`, { note });
  return data;
}

export async function updateAdminOrderTracking(id, payload = {}) {
  const safeId = encodeURIComponent(String(id || ""));

  const { data } = await api.patch(`/orders/${safeId}/tracking`, {
    carrier: payload.carrier || "",
    trackingNumber: payload.trackingNumber || "",
    trackingUrl: payload.trackingUrl || "",
  });

  return data;
}

export const getReviews = async (params = "") => {
  const query = params ? `?${params}` : "";
  const { data } = await api.get(`/reviews${query}`);
  return data;
};

export const createReview = async (payload) => {
  const { data } = await api.post("/reviews", payload);
  return data;
};

export const updateReview = async (id, payload) => {
  const { data } = await api.put(`/reviews/${id}`, payload);
  return data;
};

export const deleteReview = async (id) => {
  const { data } = await api.delete(`/reviews/${id}`);
  return data;
};

export default api;
