// src/reducers/myMessages/myMessagesActions.js
import { MY_MESSAGES_ACTIONS as T } from "./myMessagesActionTypes";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const LIST_MY_TICKETS = "/contacts/my";
const OPEN_MY_TICKET = (id) => `/contacts/my/${id}`;
const REPLY_MY_TICKET = (id) => `/contacts/my/${id}/reply`;

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((c) => c.trim());
  const hit = parts.find((c) => c.startsWith(`${name}=`));
  if (!hit) return "";
  return decodeURIComponent(hit.split("=").slice(1).join("="));
}

function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function ensureCsrfToken() {
  // 1) Try cookie first (fast)
  const fromCookie = getCookie("csrfToken");
  if (fromCookie) return fromCookie;

  // 2) Ask backend to issue one (sets cookie + returns token)
  const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...authHeaders(),
    },
  });

  const body = await safeJson(res);

  // Your issueCsrf likely returns { success:true, token } or { csrfToken }
  const token =
    body?.token ||
    body?.csrfToken ||
    body?.data?.token ||
    body?.data?.csrfToken ||
    "";

  // If still empty, maybe cookie was set but not returned
  return token || getCookie("csrfToken") || "";
}

function isNeedsLogin(res) {
  return res?.status === 401 || res?.status === 403;
}

// ✅ FIX: normalize backend response shapes (your backend returns: { item }, { items }, { contact })
function pickTicket(body) {
  return body?.item || body?.ticket || body?.contact || body?.data || body || null;
};

export const clearMyMessagesError = () => ({ type: T.CLEAR_ERROR });

export const updateMyMessageDraft = (text) => ({
  type: T.UPDATE_DRAFT,
  payload: text,
});

export const loadMyTickets = () => async (dispatch) => {
  dispatch({ type: T.LIST_START });

  try {
    const res = await fetch(API_BASE_URL + LIST_MY_TICKETS, {
      method: "GET",
      credentials: "include",
      headers: {
        ...authHeaders(),
      },
    });

    const body = await safeJson(res);

    if (!res.ok) {
      dispatch({
        type: T.LIST_ERROR,
        payload: {
          error: body?.message || "Failed to load messages.",
          needsLogin: isNeedsLogin(res),
        },
      });
      return { ok: false, message: body?.message || "Failed to load messages." };
    }

    // Accept multiple shapes safely
    const items = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.contacts)
      ? body.contacts
      : Array.isArray(body?.data)
      ? body.data
      : [];

    dispatch({
      type: T.LIST_SUCCESS,
      payload: { items },
    });

    return { ok: true, items };
  } catch (e) {
    dispatch({
      type: T.LIST_ERROR,
      payload: { error: e?.message || "Network error.", needsLogin: false },
    });
    return { ok: false, message: e?.message || "Network error." };
  }
};

export const openTicket = (id) => async (dispatch) => {
  dispatch({ type: T.OPEN_START });

  try {
    const res = await fetch(API_BASE_URL + OPEN_MY_TICKET(id), {
      method: "GET",
      credentials: "include",
      headers: {
        ...authHeaders(),
      },
    });

    const body = await safeJson(res);

    if (!res.ok) {
      dispatch({
        type: T.OPEN_ERROR,
        payload: {
          error: body?.message || "Failed to open thread.",
          needsLogin: isNeedsLogin(res),
        },
      });
      return { ok: false, message: body?.message || "Failed to open thread." };
    }

    const ticket = pickTicket(body);

    dispatch({
      type: T.OPEN_SUCCESS,
      payload: { id, ticket },
    });

    dispatch({ type: T.SET_SELECTED_ID, payload: id });

    return { ok: true, ticket };
  } catch (e) {
    dispatch({
      type: T.OPEN_ERROR,
      payload: { error: e?.message || "Network error.", needsLogin: false },
    });
    return { ok: false, message: e?.message || "Network error." };
  }
};

export const sendMyReply = (id, message) => async (dispatch) => {
  const text = String(message || "").trim();
  if (!text) {
    const err = "Message cannot be empty.";
    dispatch({ type: T.REPLY_ERROR, payload: { error: err, needsLogin: false } });
    return { ok: false, message: err };
  }

  dispatch({ type: T.REPLY_START });

  try {
    // ✅ CSRF token required because app.use(csrfRequired) blocks POST without it
    const csrfToken = await ensureCsrfToken();

    const res = await fetch(API_BASE_URL + REPLY_MY_TICKET(id), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...authHeaders(),
      },
      body: JSON.stringify({ message: text }),
    });

    const body = await safeJson(res);

    if (!res.ok) {
      // If CSRF failed, backend usually replies 403. Give user a useful message.
      const msg =
        body?.message ||
        (res.status === 403
          ? "Forbidden. Your session or CSRF token may be invalid. Please refresh and try again."
          : "Failed to send reply.");

      dispatch({
        type: T.REPLY_ERROR,
        payload: {
          error: msg,
          needsLogin: isNeedsLogin(res),
        },
      });

      return { ok: false, message: msg };
    }

    const ticket = pickTicket(body);

    dispatch({
      type: T.REPLY_SUCCESS,
      payload: { ticket },
    });

    return { ok: true, ticket };
  } catch (e) {
    dispatch({
      type: T.REPLY_ERROR,
      payload: { error: e?.message || "Network error.", needsLogin: false },
    });
    return { ok: false, message: e?.message || "Network error." };
  }
};
