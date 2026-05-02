// /src/lib/apiClient.js
import axios from "axios";

// const isDev = import.meta.env.DEV;

/**
 * ✅ Base URL rules:
 * 1) Use VITE_API_BASE_URL when provided (dev/prod)
 * 2) Otherwise fall back to localhost in dev
 * 3) Otherwise fall back to the REAL API domain in prod
 *
 * NOTE: Your API domain is https://api.knockoutcodes.com (NOT https://www.knockoutcodes.com)
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL &&
    String(import.meta.env.VITE_API_BASE_URL).trim()) ||
  "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Optionally set/remove an Authorization header (Bearer token).
 * (You still use httpOnly cookies too via withCredentials.)
 */
export function setAuthToken(token) {
  const t =
    token && typeof token === "string" && token !== "undefined" && token !== "null"
      ? token.trim()
      : "";

  if (t.length > 20) {
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

/**
 * Attach a single global 401 handler (prevents stacking interceptors).
 * Call this once (e.g., in AuthContext).
 */
let _unauthorizedInterceptorId = null;

export function attach401Handler(onUnauthorized) {
  if (typeof onUnauthorized !== "function") return;

  // avoid stacking multiple interceptors on hot reload / rerenders
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

/** GET /api/v1/testimonials -> returns array */
export async function getAllTestimonials() {
  const { data } = await api.get("/testimonials");
  if (Array.isArray(data?.testimonials)) return data.testimonials;
  if (Array.isArray(data)) return data;
  return [];
}

// ✅ Checkout API (Stripe) — reusable base
async function postCheckout(path, payload) {
  const { data } = await api.post(path, payload);
  // backend returns { url, id }
  if (!data?.url) throw new Error("Checkout URL missing from server response.");
  return data;
}

/**
 * Products (one-time payment)
 * POST /api/v1/checkout/products
 * body: { items: [{ productId, qty }] }
 */
export async function createProductCheckoutSession(items) {
  const safeItems = Array.isArray(items) ? items : [];
  return postCheckout("/checkout/products", { items: safeItems });
}

/**
 * Subscriptions (later)
 * POST /api/v1/checkout/subscriptions
 * body: { planId } or { priceId } depending on your backend
 */
export async function createSubscriptionCheckoutSession(payload) {
  return postCheckout("/checkout/subscriptions", payload);
}

/* =========================
   ✅ Memberships (FIXED PATHS)
========================= */

/**
 * GET /api/v1/memberships
 * Supports querystring: ?published=true&sort=enrolled
 */
export async function getMemberships(params = "") {
  const q = String(params || "").trim();
  const { data } = await api.get(`/memberships${q ? `?${q}` : ""}`);

  // supports: { data: [] } or { memberships: [] } or []
  const list = data?.data ?? data?.memberships ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * GET /api/v1/memberships/:id
 */
export async function getMembershipById(id) {
  const safe = encodeURIComponent(String(id || ""));
  const { data } = await api.get(`/memberships/${safe}`);
  return data?.data ?? data?.membership ?? data;
}

/**
 * Membership checkout (uses your CURRENT backend endpoint)
 * POST /subscriptions/checkout
 */
export async function createMembershipCheckoutSession(payload) {
  const { data } = await api.post("/subscriptions/checkout", payload);
  if (!data?.url) throw new Error("Checkout URL missing from server response.");
  return data; // { url, id? }
}

export default api;
