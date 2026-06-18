// src/reducers/manageContact/manageContactActions.js
import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_CONTACTS_ACTIONS as T } from "./manageContactActionTypes";

const STATUS = {
  NEW: "new",
  OPEN: "open",
  PENDING: "pending",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

let fetchAbort = null;

const getErrMsg = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const ensureArray = (v) => {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.contacts)) return v.contacts;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.data?.contacts)) return v.data.contacts;
  if (Array.isArray(v?.data?.items)) return v.data.items;
  return [];
};

const chunk = (arr, size = 10) => {
  const safeArr = ensureArray(arr);
  const out = [];

  for (let i = 0; i < safeArr.length; i += size) {
    out.push(safeArr.slice(i, i + size));
  }

  return out;
};

export const fetchManageContacts =
  ({ silent = false, page = 1, limit = 100 } = {}) =>
  async (dispatch) => {
    const requestId = Date.now();

    try {
      if (fetchAbort) fetchAbort.abort();
    } catch {
      // ignore abort errors
    }

    fetchAbort = new AbortController();

    dispatch({ type: T.FETCH_START, payload: { requestId, silent } });

    try {
      const res = await axiosInstance.get("/contacts", {
        params: { page, limit },
        signal: fetchAbort.signal,
        headers: { "Cache-Control": "no-store" },
      });

      const list = ensureArray(res?.data?.contacts || res?.data);

      dispatch({
        type: T.FETCH_SUCCESS,
        payload: { requestId, data: list },
      });
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;

      dispatch({
        type: T.FETCH_FAIL,
        payload: {
          requestId,
          silent,
          error: getErrMsg(err, "Failed to fetch contacts."),
        },
      });
    }
  };

export const selectManageContact = (contact) => ({
  type: T.SELECT,
  payload: contact,
});

export const updateManageContactField = (name, value) => ({
  type: T.UPDATE_FIELD,
  payload: { name, value },
});

export const updateReplyDraft = (value) => ({
  type: T.UPDATE_REPLY_DRAFT,
  payload: value,
});

export const clearReplyDraft = () => ({
  type: T.CLEAR_REPLY_DRAFT,
});

export const clearManageContactError = () => ({
  type: T.CLEAR_ERROR,
});

export const saveManageContact = (id, form) => async (dispatch) => {
  const requestId = Date.now();

  dispatch({ type: T.SAVE_START, payload: { requestId } });

  try {
    const payload = {
      status: form?.status,
      isSeen: !!form?.isSeen,
      replied: !!form?.replied,
      replyNote: String(form?.replyNote || "").slice(0, 2000),
    };

    if (!Object.values(STATUS).includes(payload.status)) {
      payload.status = STATUS.NEW;
    }

    const res = await axiosInstance.put(`/contacts/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || "Save failed");
    }

    const updated =
      res?.data?.contact || res?.data?.data?.contact || res?.data?.data || null;

    dispatch({
      type: T.SAVE_SUCCESS,
      payload: { requestId, data: updated },
    });

    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.SAVE_FAIL,
      payload: {
        requestId,
        error: getErrMsg(err, "Failed to save contact."),
      },
    });
  }
};

export const sendAdminReply = (id, text) => async (dispatch) => {
  const requestId = Date.now();

  dispatch({ type: T.REPLY_START, payload: { requestId } });

  try {
    const clean = String(text || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) throw new Error("Reply cannot be empty.");
    if (clean.length > 5000) throw new Error("Reply exceeds maximum length.");

    const res = await axiosInstance.post(
      `/contacts/${id}/reply`,
      { message: clean },
      { headers: { "Content-Type": "application/json" } },
    );

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || "Reply failed");
    }

    const updated =
      res?.data?.contact || res?.data?.data?.contact || res?.data?.data || null;

    dispatch({
      type: T.REPLY_SUCCESS,
      payload: { requestId, data: updated },
    });

    dispatch(clearReplyDraft());

    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.REPLY_FAIL,
      payload: {
        requestId,
        error: getErrMsg(err, "Failed to send reply."),
      },
    });
  }
};

export const deleteManageContact = (id) => async (dispatch) => {
  const requestId = Date.now();

  dispatch({ type: T.DELETE_START, payload: { requestId } });

  try {
    const res = await axiosInstance.delete(`/contacts/${id}`);

    if (!res?.data?.success) {
      throw new Error(res?.data?.message || "Delete failed");
    }

    dispatch({
      type: T.DELETE_SUCCESS,
      payload: { requestId, id },
    });

    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.DELETE_FAIL,
      payload: {
        requestId,
        error: getErrMsg(err, "Failed to delete contact."),
      },
    });
  }
};

export const markAllContactsSeen = () => async (dispatch, getState) => {
  const requestId = Date.now();

  dispatch({ type: T.BULK_START, payload: { requestId } });

  try {
    const state = getState();
    const store = state?.manageContacts || {};

    const contacts = ensureArray(store.contacts).length
      ? ensureArray(store.contacts)
      : ensureArray(store.items);

    const targets = contacts.filter((c) => !c?.isSeen).slice(0, 200);

    if (targets.length === 0) {
      dispatch({
        type: T.BULK_SUCCESS,
        payload: { requestId, contacts },
      });
      return;
    }

    const optimistic = contacts.map((c) =>
      targets.some((t) => String(t?._id) === String(c?._id))
        ? { ...c, isSeen: true }
        : c,
    );

    dispatch({
      type: T.BULK_SUCCESS,
      payload: { requestId, contacts: optimistic },
    });

    const groups = chunk(targets, 10);

    for (const group of groups) {
      await Promise.all(
        group.map((c) =>
          axiosInstance.put(
            `/contacts/${c._id}`,
            { isSeen: true },
            { headers: { "Content-Type": "application/json" } },
          ),
        ),
      );
    }

    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.BULK_FAIL,
      payload: {
        requestId,
        error: getErrMsg(err, "Failed to mark all as seen."),
      },
    });
  }
};

export const realtimeUpsertContact = (contact) => ({
  type: T.REALTIME_UPSERT,
  payload: contact,
});

export const realtimeDeleteContact = (contactId) => ({
  type: T.REALTIME_DELETE,
  payload: contactId,
});
