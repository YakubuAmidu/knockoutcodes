// src/reducers/newsletter/newsletterActions.js

import { NEWSLETTER_ACTIONS } from "./newsletterActionTypes";

// API BASE
const rawBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const API_BASE = rawBase.includes("/api/")
  ? rawBase.replace(/\/+$/, "")
  : `${rawBase.replace(/\/+$/, "")}/api/v1`;

const NEWSLETTER_TIMEOUT_MS = 10000;

const validEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());

// Get CSRF token first, then use it in unsafe requests like POST
const getCsrfToken = async (signal) => {
  const res = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.csrfToken) {
    throw new Error(
      data?.message || "Unable to get CSRF token. Please refresh and try again."
    );
  }

  return data.csrfToken;
};

const failPayload = (message, status = 0, raw = null) => ({
  error: message,
  message,
  status,
  raw,
});

export const subscribeToNewsletter = (email, meta = {}) => async (dispatch) => {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    const msg = "Email is required.";

    dispatch({
      type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
      payload: failPayload(msg, 400),
    });

    return { ok: false, status: 400, data: null, message: msg };
  }

  if (!validEmail(cleanEmail)) {
    const msg = "Please enter a valid email address.";

    dispatch({
      type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
      payload: failPayload(msg, 400),
    });

    return { ok: false, status: 400, data: null, message: msg };
  }

  dispatch({
    type: NEWSLETTER_ACTIONS.SUBSCRIBE_REQUEST,
    payload: { email: cleanEmail, message: "Securing your spot…" },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, NEWSLETTER_TIMEOUT_MS);

  try {
    // 1. Get CSRF token first
    const csrfToken = await getCsrfToken(controller.signal);

    // 2. Send newsletter subscribe request with CSRF header + cookies
    const res = await fetch(`${API_BASE}/newsletters`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        email: cleanEmail,
        source: typeof meta?.source === "string" ? meta.source.trim() : "footer",
        company: typeof meta?.company === "string" ? meta.company.trim() : "",
        website: typeof meta?.website === "string" ? meta.website.trim() : "",
        notes: typeof meta?.notes === "string" ? meta.notes.trim() : "",
        name: typeof meta?.name === "string" ? meta.name.trim() : "",
        topic: typeof meta?.topic === "string" ? meta.topic.trim() : "",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 201 || res.ok) {
      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_SUCCESS,
        payload: {
          email: cleanEmail,
          message:
            data?.message || "You’re in. Watch your inbox for elite drops.",
          raw: data,
          status: res.status,
        },
      });

      return {
        ok: true,
        status: res.status,
        data,
        message: data?.message || "Subscribed successfully.",
      };
    }

    if (res.status === 409) {
      const msg = data?.message || "You’re already on the list.";

      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
        payload: failPayload(msg, res.status, data),
      });

      return { ok: false, status: res.status, data, message: msg };
    }

    if (res.status === 429) {
      const msg = data?.message || "Too many attempts. Please wait.";

      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
        payload: failPayload(msg, res.status, data),
      });

      return { ok: false, status: res.status, data, message: msg };
    }

    if (res.status === 403) {
      const msg =
        data?.message || "Security check failed. Please refresh and try again.";

      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
        payload: failPayload(msg, res.status, data),
      });

      return { ok: false, status: res.status, data, message: msg };
    }

    const msg = data?.message || "Subscription failed. Please try again.";

    dispatch({
      type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
      payload: failPayload(msg, res.status, data),
    });

    return { ok: false, status: res.status, data, message: msg };
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    const msg = isAbort
      ? "Request timed out. Please try again."
      : err?.message || "Network error. Please check your connection and try again.";

    dispatch({
      type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
      payload: failPayload(msg, 0, null),
    });

    return { ok: false, status: 0, data: null, message: msg, err };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const resetNewsletterSubscribe = () => ({
  type: NEWSLETTER_ACTIONS.SUBSCRIBE_RESET,
});