import axiosInstance from "../../../utils/axiosInstance";
import { NEWSLETTER_ACTIONS } from "./newsletterActionTypes";

const NEWSLETTER_TIMEOUT_MS = 10000;

const validEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());

const failPayload = (message, status = 0, raw = null) => ({
  error: message,
  message,
  status,
  raw,
});

const getErrorMessage = (error, fallback = "Subscription failed.") =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const subscribeToNewsletter =
  (email, meta = {}) =>
  async (dispatch) => {
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
      payload: {
        email: cleanEmail,
        message: "Securing your spot…",
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NEWSLETTER_TIMEOUT_MS);

    try {
      try {
        await axiosInstance.get("/auth/csrf", {
          signal: controller.signal,
        });
      } catch {
        // axiosInstance may already have CSRF/cookie support
      }

      const body = {
        email: cleanEmail,
        source:
          typeof meta?.source === "string" && meta.source.trim()
            ? meta.source.trim()
            : "footer",
        company: typeof meta?.company === "string" ? meta.company.trim() : "",
        website: typeof meta?.website === "string" ? meta.website.trim() : "",
      };

      if (typeof meta?.name === "string" && meta.name.trim()) {
        body.name = meta.name.trim().slice(0, 80);
      }

      if (typeof meta?.topic === "string" && meta.topic.trim()) {
        body.topic = meta.topic.trim().slice(0, 80);
      }

      const res = await axiosInstance.post("/newsletters", body, {
        signal: controller.signal,
      });

      const msg =
        res?.data?.message || "You’re in. Watch your inbox for elite drops.";

      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_SUCCESS,
        payload: {
          email: cleanEmail,
          message: msg,
          raw: res.data,
          status: res.status,
        },
      });

      return {
        ok: true,
        status: res.status,
        data: res.data,
        message: msg,
      };
    } catch (error) {
      const isAbort =
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError";

      const status = error?.response?.status || 0;

      const msg = isAbort
        ? "Request timed out. Please try again."
        : navigator.onLine === false
        ? "No internet connection detected."
        : getErrorMessage(error, "Network error. Please try again.");

      dispatch({
        type: NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL,
        payload: failPayload(msg, status, error?.response?.data || null),
      });

      return {
        ok: false,
        status,
        data: error?.response?.data || null,
        message: msg,
        error,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

export const resetNewsletterSubscribe = () => ({
  type: NEWSLETTER_ACTIONS.SUBSCRIBE_RESET,
});