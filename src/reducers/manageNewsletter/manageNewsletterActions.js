import { MANAGE_NEWSLETTER_ACTIONS as T } from "./manageNewsletterActionTypes";
import axiosInstance from "../../../utils/axiosInstance";

const REQUEST_TIMEOUT_MS = 10000;

const getId = (n) =>
  (n && (n._id || n.id || n.newsletterId || n.newsletterID)) || "";

const validEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());

const cleanString = (value, max = 200) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";

const normalizeNewsletterPayload = (payload = {}) => ({
  name: cleanString(payload.name, 80),
  email: cleanString(payload.email, 160).toLowerCase(),
  topic: cleanString(payload.topic, 80),
  source: cleanString(payload.source, 60) || "footer",
  notes: cleanString(payload.notes, 1000),
  isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
});

const failPayload = (error, systemMessage = null) => ({
  error,
  systemMessage: systemMessage || {
    tone: "error",
    text: error,
  },
});

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.message ||
  fallback;

const ensureCsrf = async () => {
  try {
    await axiosInstance.get("/auth/csrf", {
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch {
    // axiosInstance may already have CSRF/cookie support
  }
};

export const fetchAdminNewsletters = (opts = {}) => async (dispatch) => {
  dispatch({ type: T.ADMIN_LIST_REQUEST });

  try {
    const search =
      typeof opts.search === "string" ? opts.search.trim().slice(0, 100) : "";

    const status =
      typeof opts.status === "string" && opts.status !== "all"
        ? opts.status
        : "";

    const page = Number(opts.page) || 1;
    const limit = Number(opts.limit) || 100;

    const res = await axiosInstance.get("/newsletters", {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        ...(search ? { q: search } : {}),
        ...(status ? { status } : {}),
        page,
        limit,
      },
    });

    const payload = res?.data || {};

    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    const selectedId =
      opts.preferredId && list.some((n) => getId(n) === opts.preferredId)
        ? opts.preferredId
        : opts.fallbackToFirst && list[0]
        ? getId(list[0])
        : null;

    dispatch({
      type: T.ADMIN_LIST_SUCCESS,
      payload: {
        list,
        selectedId,
        total: payload.total,
        active: payload.active,
        inactive: payload.inactive,
        page: payload.page,
        pages: payload.pages,
      },
    });

    return {
      ok: true,
      list,
      selectedId,
      total: payload.total,
      active: payload.active,
      inactive: payload.inactive,
      page: payload.page,
      pages: payload.pages,
    };
  } catch (err) {
    const msg = getErrorMessage(
      err,
      "Unable to load newsletters. Please check your admin access."
    );

    dispatch({
      type: T.ADMIN_LIST_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, list: [], selectedId: null, message: msg, err };
  }
};

export const updateAdminNewsletter = (id, payload) => async (dispatch) => {
  dispatch({ type: T.ADMIN_UPDATE_REQUEST });

  const safeId = String(id || "").trim();

  if (!safeId) {
    const msg = "Invalid subscriber ID.";
    dispatch({ type: T.ADMIN_UPDATE_FAIL, payload: failPayload(msg) });
    return { ok: false, updated: null, message: msg };
  }

  const cleanPayload = normalizeNewsletterPayload(payload);

  if (!cleanPayload.email) {
    const msg = "Email is required.";
    dispatch({ type: T.ADMIN_UPDATE_FAIL, payload: failPayload(msg) });
    return { ok: false, updated: null, message: msg };
  }

  if (!validEmail(cleanPayload.email)) {
    const msg = "Please enter a valid email address.";
    dispatch({ type: T.ADMIN_UPDATE_FAIL, payload: failPayload(msg) });
    return { ok: false, updated: null, message: msg };
  }

  try {
    await ensureCsrf();

    const res = await axiosInstance.patch(
      `/newsletters/${encodeURIComponent(safeId)}`,
      cleanPayload,
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const responsePayload = res?.data;
    const updatedDoc =
      responsePayload?.data && typeof responsePayload.data === "object"
        ? responsePayload.data
        : responsePayload;

    dispatch({
      type: T.ADMIN_UPDATE_SUCCESS,
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
    const msg = getErrorMessage(
      err,
      "Update failed. Please try again or check your admin access."
    );

    dispatch({
      type: T.ADMIN_UPDATE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, updated: null, message: msg, err };
  }
};

export const deleteAdminNewsletter = (id) => async (dispatch) => {
  dispatch({ type: T.ADMIN_DELETE_REQUEST });

  const safeId = String(id || "").trim();

  if (!safeId) {
    const msg = "Invalid subscriber ID.";

    dispatch({
      type: T.ADMIN_DELETE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, deletedId: null, message: msg };
  }

  try {
    await ensureCsrf();

    await axiosInstance.delete(`/newsletters/${encodeURIComponent(safeId)}`, {
      timeout: REQUEST_TIMEOUT_MS,
    });

    dispatch({
      type: T.ADMIN_DELETE_SUCCESS,
      payload: { deletedId: safeId },
    });

    return { ok: true, deletedId: safeId };
  } catch (err) {
    const msg = getErrorMessage(err, "Failed to delete subscriber.");

    dispatch({
      type: T.ADMIN_DELETE_FAIL,
      payload: failPayload(msg),
    });

    return { ok: false, deletedId: null, message: msg, err };
  }
};

export const bulkUpdateAdminNewsletters = (id, payload) => async (dispatch) => {
  return dispatch(updateAdminNewsletter(id, payload));
};

export const setSelectedNewsletterId = (id) => ({
  type: T.SET_SELECTED_ID,
  payload: String(id || "").trim(),
});

export const setManageNewsletterSearch = (val) => ({
  type: T.SET_SEARCH,
  payload: typeof val === "string" ? val.slice(0, 100) : "",
});

export const setManageNewsletterSystemMessage = (tone, text) => ({
  type: T.SET_SYSTEM_MESSAGE,
  payload:
    tone && text
      ? {
          tone,
          text: String(text).trim(),
        }
      : null,
});

export const clearManageNewsletterSystemMessage = () => ({
  type: T.CLEAR_SYSTEM_MESSAGE,
});