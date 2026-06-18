// src/reducers/manageContact/manageContactReducer.js
import { MANAGE_CONTACTS_ACTIONS as T } from "./manageContactActionTypes";

const ensureArray = (v) => {
  if (Array.isArray(v)) return v;

  if (Array.isArray(v?.contacts)) return v.contacts;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.data?.contacts)) return v.data.contacts;
  if (Array.isArray(v?.data?.items)) return v.data.items;

  return [];
};

const getContactFromPayload = (payload) => {
  return (
    payload?.contact ||
    payload?.data?.contact ||
    payload?.data?.data?.contact ||
    payload?.data ||
    payload
  );
};

const safeCloneContact = (c = {}) => ({
  _id: c?._id,
  user: c?.user ?? null,
  name: c?.name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  subject: c?.subject ?? "",
  message: c?.message ?? "",
  status: c?.status ?? "new",
  isSeen: !!c?.isSeen,
  replied: !!c?.replied,
  replyNote: c?.replyNote ?? "",
  messages: Array.isArray(c?.messages)
    ? c.messages.map((m) => ({
        _id: m?._id,
        sender: m?.sender,
        text: m?.text ?? "",
        createdAt: m?.createdAt ?? null,
        updatedAt: m?.updatedAt ?? null,
      }))
    : [],
  createdAt: c?.createdAt ?? null,
  updatedAt: c?.updatedAt ?? null,
  lastMessageAt: c?.lastMessageAt ?? null,
  lastSender: c?.lastSender ?? null,
});

const buildFormFromContact = (c) => ({
  name: c?.name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  subject: c?.subject ?? "",
  message: c?.message ?? "",
  status: c?.status ?? "new",
  isSeen: !!c?.isSeen,
  replied: !!c?.replied,
  replyNote: c?.replyNote ?? "",
});

const upsertContact = (list, rawContact) => {
  const safeList = ensureArray(list);
  const realContact = getContactFromPayload(rawContact);
  const updated = safeCloneContact(realContact);

  if (!updated?._id) return safeList;

  const exists = safeList.some((c) => String(c?._id) === String(updated._id));

  if (exists) {
    return safeList.map((c) =>
      String(c?._id) === String(updated._id) ? updated : c,
    );
  }

  return [updated, ...safeList];
};

export const manageContactInitialState = {
  contacts: [],
  items: [],

  loading: false,
  saving: false,
  deleting: false,
  bulkUpdating: false,
  replying: false,

  error: "",

  selectedId: null,

  form: {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    status: "new",
    isSeen: false,
    replied: false,
    replyNote: "",
  },

  replyDraft: "",

  lastFetchedAt: null,
  lastSavedAt: null,

  lastFetchRequestId: 0,
  lastSaveRequestId: 0,
  lastDeleteRequestId: 0,
  lastBulkRequestId: 0,
  lastReplyRequestId: 0,
};

const normalizeState = (state) => {
  const base =
    state && typeof state === "object" && !Array.isArray(state)
      ? state
      : manageContactInitialState;

  const contacts = ensureArray(base.contacts);
  const items = ensureArray(base.items).length
    ? ensureArray(base.items)
    : contacts;

  return {
    ...manageContactInitialState,
    ...base,
    contacts,
    items,
    form:
      base.form && typeof base.form === "object" && !Array.isArray(base.form)
        ? base.form
        : manageContactInitialState.form,
    error: typeof base.error === "string" ? base.error : "",
  };
};

export default function manageContactReducer(
  state = manageContactInitialState,
  action,
) {
  const normalizedState = normalizeState(state);

  switch (action.type) {
    case T.FETCH_START:
      return {
        ...normalizedState,
        loading: action.payload?.silent ? normalizedState.loading : true,
        error: action.payload?.silent ? normalizedState.error : "",
        lastFetchRequestId: action.payload?.requestId || Date.now(),
      };

    case T.FETCH_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastFetchRequestId) {
        return normalizedState;
      }

      const incoming = ensureArray(action.payload?.data).map(safeCloneContact);

      const stillSelected =
        normalizedState.selectedId &&
        incoming.some(
          (c) => String(c?._id) === String(normalizedState.selectedId),
        );

      const found = stillSelected
        ? incoming.find(
            (c) => String(c?._id) === String(normalizedState.selectedId),
          )
        : null;

      return {
        ...normalizedState,
        loading: false,
        contacts: incoming,
        items: incoming,
        selectedId: stillSelected ? normalizedState.selectedId : null,
        form: found ? buildFormFromContact(found) : normalizedState.form,
        error: "",
        lastFetchedAt: Date.now(),
      };
    }

    case T.FETCH_FAIL:
      if (action.payload?.requestId !== normalizedState.lastFetchRequestId) {
        return normalizedState;
      }

      return {
        ...normalizedState,
        loading: action.payload?.silent ? normalizedState.loading : false,
        error: action.payload?.silent
          ? normalizedState.error
          : action.payload?.error || "Failed to fetch contacts.",
      };

    case T.SELECT: {
      if (!action.payload?._id) return normalizedState;

      const c = safeCloneContact(action.payload);

      return {
        ...normalizedState,
        selectedId: c._id,
        form: buildFormFromContact(c),
        error: "",
      };
    }

    case T.UPDATE_FIELD:
      return {
        ...normalizedState,
        form: {
          ...normalizedState.form,
          [action.payload?.name]: action.payload?.value,
        },
      };

    case T.UPDATE_REPLY_DRAFT:
      return {
        ...normalizedState,
        replyDraft: action.payload ?? "",
      };

    case T.CLEAR_REPLY_DRAFT:
      return {
        ...normalizedState,
        replyDraft: "",
      };

    case T.CLEAR_ERROR:
      return {
        ...normalizedState,
        error: "",
      };

    case T.SAVE_START:
      return {
        ...normalizedState,
        saving: true,
        error: "",
        lastSaveRequestId: action.payload?.requestId || Date.now(),
      };

    case T.SAVE_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastSaveRequestId) {
        return normalizedState;
      }

      const updatedRaw = getContactFromPayload(action.payload?.data);
      const updated = safeCloneContact(updatedRaw);
      const nextContacts = upsertContact(normalizedState.contacts, updated);

      const isSelected =
        normalizedState.selectedId &&
        String(normalizedState.selectedId) === String(updated?._id);

      return {
        ...normalizedState,
        saving: false,
        contacts: nextContacts,
        items: nextContacts,
        form: isSelected ? buildFormFromContact(updated) : normalizedState.form,
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.SAVE_FAIL:
      if (action.payload?.requestId !== normalizedState.lastSaveRequestId) {
        return normalizedState;
      }

      return {
        ...normalizedState,
        saving: false,
        error: action.payload?.error || "Failed to save contact.",
      };

    case T.REPLY_START:
      return {
        ...normalizedState,
        replying: true,
        error: "",
        lastReplyRequestId: action.payload?.requestId || Date.now(),
      };

    case T.REPLY_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastReplyRequestId) {
        return normalizedState;
      }

      const updatedRaw = getContactFromPayload(action.payload?.data);
      const updated = safeCloneContact(updatedRaw);
      const nextContacts = upsertContact(normalizedState.contacts, updated);

      const isSelected =
        normalizedState.selectedId &&
        String(normalizedState.selectedId) === String(updated?._id);

      return {
        ...normalizedState,
        replying: false,
        contacts: nextContacts,
        items: nextContacts,
        form: isSelected ? buildFormFromContact(updated) : normalizedState.form,
        replyDraft: "",
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.REPLY_FAIL:
      if (action.payload?.requestId !== normalizedState.lastReplyRequestId) {
        return normalizedState;
      }

      return {
        ...normalizedState,
        replying: false,
        error: action.payload?.error || "Failed to send reply.",
      };

    case T.DELETE_START:
      return {
        ...normalizedState,
        deleting: true,
        error: "",
        lastDeleteRequestId: action.payload?.requestId || Date.now(),
      };

    case T.DELETE_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastDeleteRequestId) {
        return normalizedState;
      }

      const deletedId = action.payload?.id;

      const nextContacts = ensureArray(normalizedState.contacts).filter(
        (c) => String(c?._id) !== String(deletedId),
      );

      const shouldClear =
        String(normalizedState.selectedId) === String(deletedId);

      return {
        ...normalizedState,
        deleting: false,
        contacts: nextContacts,
        items: nextContacts,
        selectedId: shouldClear ? null : normalizedState.selectedId,
        form: shouldClear
          ? manageContactInitialState.form
          : normalizedState.form,
        replyDraft: shouldClear ? "" : normalizedState.replyDraft,
        error: "",
      };
    }

    case T.DELETE_FAIL:
      if (action.payload?.requestId !== normalizedState.lastDeleteRequestId) {
        return normalizedState;
      }

      return {
        ...normalizedState,
        deleting: false,
        error: action.payload?.error || "Failed to delete contact.",
      };

    case T.BULK_START:
      return {
        ...normalizedState,
        bulkUpdating: true,
        error: "",
        lastBulkRequestId: action.payload?.requestId || Date.now(),
      };

    case T.BULK_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastBulkRequestId) {
        return normalizedState;
      }

      const raw = action.payload?.contacts ?? action.payload?.data;
      const updatedList = ensureArray(raw).map(safeCloneContact);
      const next = updatedList.length ? updatedList : normalizedState.contacts;

      return {
        ...normalizedState,
        bulkUpdating: false,
        contacts: next,
        items: next,
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.BULK_FAIL:
      if (action.payload?.requestId !== normalizedState.lastBulkRequestId) {
        return normalizedState;
      }

      return {
        ...normalizedState,
        bulkUpdating: false,
        error: action.payload?.error || "Bulk update failed.",
      };

    case T.REALTIME_UPSERT: {
      const updated = safeCloneContact(action.payload);
      if (!updated?._id) return normalizedState;

      const nextContacts = upsertContact(normalizedState.contacts, updated);

      const isSelected =
        normalizedState.selectedId &&
        String(normalizedState.selectedId) === String(updated._id);

      return {
        ...normalizedState,
        contacts: nextContacts,
        items: nextContacts,
        form: isSelected ? buildFormFromContact(updated) : normalizedState.form,
        lastFetchedAt: Date.now(),
      };
    }

    case T.REALTIME_DELETE: {
      const deletedId = action.payload;

      const nextContacts = ensureArray(normalizedState.contacts).filter(
        (c) => String(c?._id) !== String(deletedId),
      );

      const shouldClear =
        String(normalizedState.selectedId) === String(deletedId);

      return {
        ...normalizedState,
        contacts: nextContacts,
        items: nextContacts,
        selectedId: shouldClear ? null : normalizedState.selectedId,
        form: shouldClear
          ? manageContactInitialState.form
          : normalizedState.form,
        replyDraft: shouldClear ? "" : normalizedState.replyDraft,
        lastFetchedAt: Date.now(),
      };
    }

    default:
      return normalizedState;
  }
}
