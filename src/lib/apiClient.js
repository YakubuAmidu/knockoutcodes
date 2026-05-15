// /src/lib/apiClient.js
import axios from "axios";

/**
 * ✅ Base URL rules:
 * 1) Use VITE_API_BASE_URL when provided
 * 2) Otherwise fall back to localhost in dev
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL &&
    String(import.meta.env.VITE_API_BASE_URL).trim()) ||
  "http://localhost:5000/api/v1";

/**
 * ✅ Read cookie helper for CSRF token
 */
function getCookie(name) {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
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

/**
 * ✅ Attach CSRF token automatically for unsafe requests
 */
api.interceptors.request.use(
  (config) => {
    const method = String(config.method || "get").toUpperCase();
    const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

    if (unsafeMethods.includes(method)) {
      const csrfToken = getCookie("csrfToken");

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Optionally set/remove an Authorization header.
 */
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
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

/**
 * Attach a single global 401 handler.
 */
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
    }
  );
}

/** GET /api/v1/testimonials */
export async function getAllTestimonials() {
  const { data } = await api.get("/testimonials");

  if (Array.isArray(data?.testimonials)) return data.testimonials;
  if (Array.isArray(data)) return data;

  return [];
}

/**
 * ✅ Checkout API helper
 */
async function postCheckout(path, payload) {
  const { data } = await api.post(path, payload);

  if (!data?.url) {
    throw new Error("Checkout URL missing from server response.");
  }

  return data;
}

/**
 * Products checkout
 * POST /api/v1/checkout/products
 */
export async function createProductCheckoutSession(items) {
  const safeItems = Array.isArray(items) ? items : [];

  return postCheckout("/checkout/products", {
    items: safeItems,
  });
}

/* =========================
   Memberships
========================= */

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
  const { data } = await api.post("/subscriptions/checkout", payload);

  if (!data?.url) {
    throw new Error("Checkout URL missing from server response.");
  }

  return data;
}

export async function getMySubscription() {
  const { data } = await api.get("/subscriptions/me");
  return data?.data ?? data?.subscription ?? data;
}

export async function switchMembershipPlan(payload) {
  const { data } = await api.patch("/subscriptions/switch", payload);
  return data?.data ?? data;
}

export async function cancelMyMembership() {
  const { data } = await api.patch("/subscriptions/cancel");
  return data?.data ?? data;
}

export async function confirmProductCheckoutSession(sessionId) {
  const safe = encodeURIComponent(String(sessionId || ""));
  const bust = Date.now();

  const { data } = await api.get(
    `/orders/confirm-product?session_id=${safe}&t=${bust}`,
    {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }
  );

  return data;
}

// ======================================================
// 🏆 MANAGE ORDERS API
// Premium enterprise admin order management system
// Uses the secured global api instance with cookies + CSRF.
// ======================================================

// Get all orders — Admin only
export async function getAdminOrders(params = {}) {
  const { data } = await api.get("/orders", { params });
  return data;
}

// Get single order — Admin/User protected by backend
export async function getAdminOrder(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.get(`/orders/${safeId}`);
  return data;
}

// Update order — Admin only
export async function updateAdminOrder(id, payload = {}) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.put(`/orders/${safeId}`, payload);
  return data;
}

// Delete order — Admin only
export async function deleteAdminOrder(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.delete(`/orders/${safeId}`);
  return data;
}

// Mark order as seen — Admin only
export async function markAdminOrderSeen(id) {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/seen`);
  return data;
}

// Fulfill order — Admin only
export async function fulfillAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/fulfill`, { note });
  return data;
}

// Cancel order — Admin only
export async function cancelAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/cancel`, { note });
  return data;
}

// Refund order — Admin only
export async function refundAdminOrder(id, note = "") {
  const safeId = encodeURIComponent(String(id || ""));
  const { data } = await api.patch(`/orders/${safeId}/refund`, { note });
  return data;
}

// Update order tracking — Admin only
export async function updateAdminOrderTracking(id, payload = {}) {
  const safeId = encodeURIComponent(String(id || ""));

  const { data } = await api.patch(`/orders/${safeId}/tracking`, {
    carrier: payload.carrier || "",
    trackingNumber: payload.trackingNumber || "",
    trackingUrl: payload.trackingUrl || "",
  });

  return data;
}

export default api;