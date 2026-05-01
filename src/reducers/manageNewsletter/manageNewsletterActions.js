import { MANAGE_NEWSLETTER_ACTIONS } from "./manageNewsletterActionTypes";
import axiosInstance from "../../../utils/axiosInstance";

// API BASE
const rawBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const API_BASE = rawBase.includes("/api/")
  ? rawBase.replace(/\/+$/, "")
  : `${rawBase.replace(/\/+$/, "")}/api/v1`;

const REQUEST_TIMEOUT_MS = 10000;

const getId = (n) =>
  (n && (n._id || n.id || n.newsletterId || n.newsletterID)) || "";

const validEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());

const cleanString = (value, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeNewsletterPayload = (payload = {}) => ({
  name: cleanString(payload.name, 80),
  email: cleanString(payload.email, 160).toLowerCase(),
  topic: cleanString(payload.topic, 60),
  source: cleanString(payload.source, 40) || "footer",
  notes: cleanString(payload.notes, 1000),
  isActive:
    typeof payload.isActive === "boolean" ? payload.isActive : true,
});

const failPayload = (error, systemMessage = null) => ({
  error,
  systemMessage:
    systemMessage || {
      tone: "error",
      text: error,
    },
});

/**
 * Admin: fetch list
 * returns { ok, list, selectedId }
 */
export const fetchAdminNewsletters = (opts = {}) => async (dispatch) => {
  dispatch({ type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_REQUEST });

  try {
    const search =
      typeof opts?.search === "string" ? opts.search.trim().slice(0, 100) : "";

    const res = await axiosInstance.get(`${API_BASE}/newsletters`, {
      withCredentials: true,
      timeout: REQUEST_TIMEOUT_MS,
      params: search ? { q: search } : undefined,
    });

    const payload = res?.data;
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    const selectedId =
      opts?.preferredId && list.some((n) => getId(n) === opts.preferredId)
        ? opts.preferredId
        : opts?.fallbackToFirst && list[0]
        ? getId(list[0])
        : null;

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_SUCCESS,
      payload: { list, selectedId },
    });

    return { ok: true, list, selectedId };
  } catch (err) {
    const msg =
      err?.code === "ECONNABORTED"
        ? "Request timed out while loading newsletters."
        : err?.response?.data?.message ||
          "Unable to load newsletters. Please check your admin access.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, list: [], selectedId: null, message: msg, err };
  }
};

/**
 * Admin: update one
 * returns { ok, updated }
 */
export const updateAdminNewsletter = (id, payload) => async (dispatch) => {
  dispatch({ type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_REQUEST });

  const safeId = String(id || "").trim();

  if (!safeId) {
    const msg = "Invalid subscriber ID.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, updated: null, message: msg };
  }

  const cleanPayload = normalizeNewsletterPayload(payload);

  if (!cleanPayload.email) {
    const msg = "Email is required.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, updated: null, message: msg };
  }

  if (!validEmail(cleanPayload.email)) {
    const msg = "Please enter a valid email address.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, updated: null, message: msg };
  }

  try {
    const res = await axiosInstance.patch(
      `${API_BASE}/newsletters/${encodeURIComponent(safeId)}`,
      cleanPayload,
      {
        withCredentials: true,
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    const responsePayload = res?.data;
    const updatedDoc =
      responsePayload?.data && typeof responsePayload.data === "object"
        ? responsePayload.data
        : responsePayload;

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_SUCCESS,
      payload: {
        updated: updatedDoc,
        systemMessage: {
          tone: "success",
          text: "Newsletter updated and synced with the database.",
        },
      },
    });

    return { ok: true, updated: updatedDoc };
  } catch (err) {
    const msg =
      err?.code === "ECONNABORTED"
        ? "Request timed out while updating the subscriber."
        : err?.response?.data?.message ||
          "Update failed. Please try again or check your admin access.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, updated: null, message: msg, err };
  }
};

/**
 * Admin: delete one
 * returns { ok, deletedId }
 */
export const deleteAdminNewsletter = (id) => async (dispatch) => {
  dispatch({
    type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_REQUEST,
  });

  const safeId = String(id || "").trim();

  if (!safeId) {
    const msg = "Invalid subscriber ID.";

    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_FAIL,
      payload: { error: msg },
    });

    return { ok: false, deletedId: null, message: msg };
  }

  try {
    await axiosInstance.delete(
      `${API_BASE}/newsletters/${encodeURIComponent(safeId)}`,
      {
        withCredentials: true,
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    // ✅ THIS IS WHERE SUCCESS DISPATCH GOES
    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_SUCCESS,
      payload: { deletedId: safeId },
    });

    return { ok: true, deletedId: safeId };
  } catch (err) {
    const msg =
      err?.code === "ECONNABORTED"
        ? "Request timed out while deleting the subscriber."
        : err?.response?.data?.message || "Failed to delete subscriber.";

    // ❌ FAILURE DISPATCH HERE
    dispatch({
      type: MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_FAIL,
      payload: { error: msg },
    });

    return { ok: false, deletedId: null, message: msg, err };
  }
};

/**
 * Admin: bulk update helper
 * keeps same external API you already started using
 */
export const bulkUpdateAdminNewsletters =
  (id, payload) => async (dispatch) => {
    return dispatch(updateAdminNewsletter(id, payload));
  };

// UI helpers
export const setSelectedNewsletterId = (id) => ({
  type: MANAGE_NEWSLETTER_ACTIONS.SET_SELECTED_ID,
  payload: String(id || "").trim(),
});

export const setManageNewsletterSearch = (val) => ({
  type: MANAGE_NEWSLETTER_ACTIONS.SET_SEARCH,
  payload: typeof val === "string" ? val.slice(0, 100) : "",
});

export const setManageNewsletterSystemMessage = (tone, text) => ({
  type: MANAGE_NEWSLETTER_ACTIONS.SET_SYSTEM_MESSAGE,
  payload:
    tone && text
      ? {
          tone,
          text: String(text).trim(),
        }
      : null,
});

export const clearManageNewsletterSystemMessage = () => ({
  type: MANAGE_NEWSLETTER_ACTIONS.CLEAR_SYSTEM_MESSAGE,
});