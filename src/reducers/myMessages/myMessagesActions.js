// src/reducers/myMessages/myMessagesActions.js
import axiosInstance from "../../../utils/axiosInstance";
import { MY_MESSAGES_ACTIONS as T } from "./myMessagesActionTypes";

const LIST_MY_TICKETS = "/contacts/my";
const OPEN_MY_TICKET = (id) => `/contacts/my/${id}`;
const REPLY_MY_TICKET = (id) => `/contacts/my/${id}/reply`;

function getCookie(name) {
  if (typeof document === "undefined") return "";

  const parts = document.cookie.split(";").map((c) => c.trim());
  const hit = parts.find((c) => c.startsWith(`${name}=`));

  if (!hit) return "";
  return decodeURIComponent(hit.split("=").slice(1).join("="));
}

function authHeaders() {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    "";

  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function isNeedsLogin(status) {
  return status === 401 || status === 403;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function pickTicket(body) {
  return body?.item || body?.ticket || body?.contact || body?.data || body || null;
}

function pickItems(body) {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.contacts)) return body.contacts;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

async function ensureCsrfToken() {
  const fromCookie = getCookie("csrfToken");
  if (fromCookie) return fromCookie;

  const res = await axiosInstance.get("/auth/csrf", {
    withCredentials: true,
    headers: {
      ...authHeaders(),
    },
  });

  const body = res?.data || {};

  return (
    body?.token ||
    body?.csrfToken ||
    body?.data?.token ||
    body?.data?.csrfToken ||
    getCookie("csrfToken") ||
    ""
  );
}

export const clearMyMessagesError = () => ({ type: T.CLEAR_ERROR });

export const updateMyMessageDraft = (text) => ({
  type: T.UPDATE_DRAFT,
  payload: text,
});

export const loadMyTickets = () => async (dispatch) => {
  dispatch({ type: T.LIST_START });

  try {
    const res = await axiosInstance.get(LIST_MY_TICKETS, {
      withCredentials: true,
      headers: {
        ...authHeaders(),
      },
    });

    const items = pickItems(res?.data);

    dispatch({
      type: T.LIST_SUCCESS,
      payload: { items },
    });

    return { ok: true, items };
  } catch (error) {
    const status = error?.response?.status;
    const message = getErrorMessage(error, "Failed to load messages.");

    dispatch({
      type: T.LIST_ERROR,
      payload: {
        error: message,
        needsLogin: isNeedsLogin(status),
      },
    });

    return { ok: false, message };
  }
};

export const openTicket = (id) => async (dispatch) => {
  dispatch({ type: T.OPEN_START });

  try {
    const res = await axiosInstance.get(OPEN_MY_TICKET(id), {
      withCredentials: true,
      headers: {
        ...authHeaders(),
      },
    });

    const ticket = pickTicket(res?.data);

    dispatch({
      type: T.OPEN_SUCCESS,
      payload: { id, ticket },
    });

    dispatch({ type: T.SET_SELECTED_ID, payload: id });

    return { ok: true, ticket };
  } catch (error) {
    const status = error?.response?.status;
    const message = getErrorMessage(error, "Failed to open thread.");

    dispatch({
      type: T.OPEN_ERROR,
      payload: {
        error: message,
        needsLogin: isNeedsLogin(status),
      },
    });

    return { ok: false, message };
  }
};

export const sendMyReply = (id, message) => async (dispatch) => {
  const text = String(message || "").trim();

  if (!text) {
    const err = "Message cannot be empty.";

    dispatch({
      type: T.REPLY_ERROR,
      payload: { error: err, needsLogin: false },
    });

    return { ok: false, message: err };
  }

  dispatch({ type: T.REPLY_START });

  try {
    const csrfToken = await ensureCsrfToken();

    const res = await axiosInstance.post(
      REPLY_MY_TICKET(id),
      { message: text },
      {
        withCredentials: true,
        headers: {
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          ...authHeaders(),
        },
      }
    );

    const ticket = pickTicket(res?.data);

    dispatch({
      type: T.REPLY_SUCCESS,
      payload: { ticket },
    });

    return { ok: true, ticket };
  } catch (error) {
    const status = error?.response?.status;

    const message =
      error?.response?.data?.message ||
      (status === 403
        ? "Forbidden. Your session or CSRF token may be invalid. Please refresh and try again."
        : error?.message || "Failed to send reply.");

    dispatch({
      type: T.REPLY_ERROR,
      payload: {
        error: message,
        needsLogin: isNeedsLogin(status),
      },
    });

    return { ok: false, message };
  }
};