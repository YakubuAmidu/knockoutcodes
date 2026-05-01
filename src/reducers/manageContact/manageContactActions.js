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

const chunk = (arr, size = 10) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const fetchManageContacts =
  ({ silent = false, page = 1, limit = 100 } = {}) =>
  async (dispatch) => {
    const requestId = Date.now();

    try {
      if (fetchAbort) fetchAbort.abort();
    } catch {
      /* empty */
    }
    fetchAbort = new AbortController();

    dispatch({ type: T.FETCH_START, payload: { requestId, silent } });

    try {
      const res = await axiosInstance.get("/contacts", {
        params: { page, limit },
        signal: fetchAbort.signal,
        headers: { "Cache-Control": "no-store" },
      });

      // ✅ FIX: backend returns { success, contacts }
      const list = Array.isArray(res?.data?.contacts) ? res.data.contacts : [];
      dispatch({ type: T.FETCH_SUCCESS, payload: { requestId, data: list } });
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
export const clearReplyDraft = () => ({ type: T.CLEAR_REPLY_DRAFT });

export const clearManageContactError = () => ({ type: T.CLEAR_ERROR });

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

    if (!Object.values(STATUS).includes(payload.status)) payload.status = STATUS.NEW;

    const res = await axiosInstance.put(`/contacts/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res?.data?.success) throw new Error(res?.data?.message || "Save failed");

    // ✅ FIX: backend returns { success, contact }
    const updated = res?.data?.contact || null;

    dispatch({
      type: T.SAVE_SUCCESS,
      payload: { requestId, data: updated },
    });

    // ✅ Optional but recommended: keep list/thread perfectly in sync
    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.SAVE_FAIL,
      payload: { requestId, error: getErrMsg(err, "Failed to save contact.") },
    });
  }
};

// ✅ Send admin reply into thread
export const sendAdminReply = (id, text) => async (dispatch) => {
  const requestId = Date.now();
  dispatch({ type: T.REPLY_START, payload: { requestId } });

  try {
    const clean = String(text || "").trim();
    if (!clean) throw new Error("Reply cannot be empty.");

    const res = await axiosInstance.post(
      `/contacts/${id}/reply`,
      // ✅ FIX: backend expects { message }
      { message: clean },
      { headers: { "Content-Type": "application/json" } }
    );

    if (!res?.data?.success) throw new Error(res?.data?.message || "Reply failed");

    // ✅ FIX: backend returns { success, contact }
    const updated = res?.data?.contact || null;

    dispatch({
      type: T.REPLY_SUCCESS,
      payload: { requestId, data: updated },
    });

    // ✅ Clear draft after a successful reply (feels professional)
    dispatch(clearReplyDraft());

    // ✅ Pull latest so thread + list counts update instantly
    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.REPLY_FAIL,
      payload: { requestId, error: getErrMsg(err, "Failed to send reply.") },
    });
  }
};

export const deleteManageContact = (id) => async (dispatch) => {
  const requestId = Date.now();
  dispatch({ type: T.DELETE_START, payload: { requestId } });

  try {
    const res = await axiosInstance.delete(`/contacts/${id}`);
    if (!res?.data?.success) throw new Error(res?.data?.message || "Delete failed");
    dispatch({ type: T.DELETE_SUCCESS, payload: { requestId, id } });
  } catch (err) {
    dispatch({
      type: T.DELETE_FAIL,
      payload: { requestId, error: getErrMsg(err, "Failed to delete contact.") },
    });
  }
};

export const markAllContactsSeen = () => async (dispatch, getState) => {
  const requestId = Date.now();
  dispatch({ type: T.BULK_START, payload: { requestId } });

  try {
    const state = getState();
    const contacts = state?.manageContacts?.contacts || [];
    const targets = contacts.filter((c) => !c.isSeen).slice(0, 200);

    if (targets.length === 0) {
      dispatch({ type: T.BULK_SUCCESS, payload: { requestId, contacts } });
      return;
    }

    const optimistic = contacts.map((c) =>
      targets.some((t) => t._id === c._id) ? { ...c, isSeen: true } : c
    );

    dispatch({ type: T.BULK_SUCCESS, payload: { requestId, contacts: optimistic } });

    const groups = chunk(targets, 10);
    for (const g of groups) {
      await Promise.all(
        g.map((c) =>
          axiosInstance.put(
            `/contacts/${c._id}`,
            { isSeen: true },
            { headers: { "Content-Type": "application/json" } }
          )
        )
      );
    }

    await dispatch(fetchManageContacts({ silent: true }));
  } catch (err) {
    dispatch({
      type: T.BULK_FAIL,
      payload: { requestId, error: getErrMsg(err, "Failed to mark all as seen.") },
    });
  }
};

