// src/reducers/manageContact/manageContactReducer.js
import { MANAGE_CONTACTS_ACTIONS as T } from "./manageContactActionTypes";

const ensureArray = (v) => (Array.isArray(v) ? v : []);

const safeCloneContact = (c) => ({
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

const initialState = {
  // ✅ Keep both keys for compatibility (some UI code uses state.items)
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

export default function manageContactReducer(state = initialState, action) {
  // ✅ CRITICAL GUARD:
  // If state is ever hydrated/persisted as a non-object, reset safely.
  const base =
    state && typeof state === "object" && !Array.isArray(state)
      ? state
      : initialState;

  // ✅ Normalize arrays no matter what shape comes in
  const normalizedContacts = ensureArray(base?.contacts);
  const normalizedItems = ensureArray(
    base?.items != null ? base.items : normalizedContacts
  );

  // ✅ Some legacy code may set `items` to an object like { contacts: [...] }
  // This makes sure we never keep that shape.
  const hardItems =
    Array.isArray(normalizedItems)
      ? normalizedItems
      : Array.isArray(normalizedContacts)
      ? normalizedContacts
      : [];

  const normalizedState = {
    ...base,
    contacts: normalizedContacts,
    items: hardItems, // ✅ guarantees .some/.map/.filter won't crash
    form:
      base?.form && typeof base.form === "object" ? base.form : initialState.form,
    error: typeof base?.error === "string" ? base.error : "",
  };

  switch (action.type) {
    case T.FETCH_START:
      return {
        ...normalizedState,
        loading: action.payload?.silent ? normalizedState.loading : true,
        error: action.payload?.silent ? normalizedState.error : "",
        lastFetchRequestId: action.payload?.requestId || Date.now(),
      };

    case T.FETCH_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastFetchRequestId)
        return normalizedState;

      const incomingRaw = ensureArray(action.payload?.data);
      const incoming = incomingRaw.map(safeCloneContact);

      const stillSelected =
        normalizedState.selectedId &&
        incoming.some((c) => c._id === normalizedState.selectedId);

      const nextSelectedId = stillSelected ? normalizedState.selectedId : null;

      const nextForm =
        stillSelected && normalizedState.selectedId
          ? (() => {
              const found = incoming.find(
                (c) => c._id === normalizedState.selectedId
              );
              return found
                ? {
                    name: found.name,
                    email: found.email,
                    phone: found.phone,
                    subject: found.subject,
                    message: found.message,
                    status: found.status,
                    isSeen: found.isSeen,
                    replied: found.replied,
                    replyNote: found.replyNote,
                  }
                : normalizedState.form;
            })()
          : normalizedState.form;

      return {
        ...normalizedState,
        loading: false,
        contacts: incoming,
        items: incoming, // ✅ keep alias synced
        selectedId: nextSelectedId,
        form: nextForm,
        error: "",
        lastFetchedAt: Date.now(),
      };
    }

    case T.FETCH_FAIL: {
      if (action.payload?.requestId !== normalizedState.lastFetchRequestId)
        return normalizedState;
      const silent = !!action.payload?.silent;
      return {
        ...normalizedState,
        loading: silent ? normalizedState.loading : false,
        error: silent
          ? normalizedState.error
          : action.payload?.error || "Failed to fetch contacts.",
      };
    }

    case T.SELECT: {
      if (!action.payload?._id) return normalizedState;
      const c = safeCloneContact(action.payload);

      return {
        ...normalizedState,
        selectedId: c._id,
        form: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          subject: c.subject,
          message: c.message,
          status: c.status,
          isSeen: c.isSeen,
          replied: c.replied,
          replyNote: c.replyNote,
        },
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
      return { ...normalizedState, replyDraft: action.payload ?? "" };

    case T.CLEAR_REPLY_DRAFT:
      return { ...normalizedState, replyDraft: "" };

    case T.CLEAR_ERROR:
      return { ...normalizedState, error: "" };

    case T.SAVE_START:
      return {
        ...normalizedState,
        saving: true,
        error: "",
        lastSaveRequestId: action.payload?.requestId || Date.now(),
      };

    case T.SAVE_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastSaveRequestId)
        return normalizedState;

      const updated = safeCloneContact(action.payload?.data || {});
      const contactsArr = ensureArray(normalizedState.contacts);

      const exists = contactsArr.some((c) => c._id === updated._id);
      const nextContacts = exists
        ? contactsArr.map((c) => (c._id === updated._id ? updated : c))
        : [updated, ...contactsArr];

      const nextForm =
        normalizedState.selectedId === updated._id
          ? {
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              subject: updated.subject,
              message: updated.message,
              status: updated.status,
              isSeen: updated.isSeen,
              replied: updated.replied,
              replyNote: updated.replyNote,
            }
          : normalizedState.form;

      return {
        ...normalizedState,
        saving: false,
        contacts: nextContacts,
        items: nextContacts, // ✅ keep alias synced
        form: nextForm,
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.SAVE_FAIL: {
      if (action.payload?.requestId !== normalizedState.lastSaveRequestId)
        return normalizedState;
      return {
        ...normalizedState,
        saving: false,
        error: action.payload?.error || "Failed to save contact.",
      };
    }

    case T.REPLY_START:
      return {
        ...normalizedState,
        replying: true,
        error: "",
        lastReplyRequestId: action.payload?.requestId || Date.now(),
      };

    case T.REPLY_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastReplyRequestId)
        return normalizedState;

      const updated = safeCloneContact(action.payload?.data || {});
      const contactsArr = ensureArray(normalizedState.contacts);

      const exists = contactsArr.some((c) => c._id === updated._id);
      const nextContacts = exists
        ? contactsArr.map((c) => (c._id === updated._id ? updated : c))
        : [updated, ...contactsArr];

      const nextForm =
        normalizedState.selectedId === updated._id
          ? {
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              subject: updated.subject,
              message: updated.message,
              status: updated.status,
              isSeen: updated.isSeen,
              replied: updated.replied,
              replyNote: updated.replyNote,
            }
          : normalizedState.form;

      return {
        ...normalizedState,
        replying: false,
        contacts: nextContacts,
        items: nextContacts, // ✅ keep alias synced
        form: nextForm,
        replyDraft: "",
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.REPLY_FAIL: {
      if (action.payload?.requestId !== normalizedState.lastReplyRequestId)
        return normalizedState;
      return {
        ...normalizedState,
        replying: false,
        error: action.payload?.error || "Failed to send reply.",
      };
    }

    case T.DELETE_START:
      return {
        ...normalizedState,
        deleting: true,
        error: "",
        lastDeleteRequestId: action.payload?.requestId || Date.now(),
      };

    case T.DELETE_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastDeleteRequestId)
        return normalizedState;

      const deletedId = action.payload?.id;
      const nextContacts = ensureArray(normalizedState.contacts).filter(
        (c) => c._id !== deletedId
      );
      const shouldClear = normalizedState.selectedId === deletedId;

      return {
        ...normalizedState,
        deleting: false,
        contacts: nextContacts,
        items: nextContacts, // ✅ keep alias synced
        selectedId: shouldClear ? null : normalizedState.selectedId,
        form: shouldClear ? initialState.form : normalizedState.form,
        replyDraft: shouldClear ? "" : normalizedState.replyDraft,
        error: "",
      };
    }

    case T.DELETE_FAIL: {
      if (action.payload?.requestId !== normalizedState.lastDeleteRequestId)
        return normalizedState;
      return {
        ...normalizedState,
        deleting: false,
        error: action.payload?.error || "Failed to delete contact.",
      };
    }

    case T.BULK_START:
      return {
        ...normalizedState,
        bulkUpdating: true,
        error: "",
        lastBulkRequestId: action.payload?.requestId || Date.now(),
      };

    case T.BULK_SUCCESS: {
      if (action.payload?.requestId !== normalizedState.lastBulkRequestId)
        return normalizedState;

      const raw = action.payload?.contacts ?? action.payload?.data;
      const updatedList = ensureArray(raw).map(safeCloneContact);

      const next = updatedList.length ? updatedList : normalizedState.contacts;

      return {
        ...normalizedState,
        bulkUpdating: false,
        contacts: next,
        items: next, // ✅ keep alias synced
        error: "",
        lastSavedAt: Date.now(),
      };
    }

    case T.BULK_FAIL: {
      if (action.payload?.requestId !== normalizedState.lastBulkRequestId)
        return normalizedState;
      return {
        ...normalizedState,
        bulkUpdating: false,
        error: action.payload?.error || "Bulk update failed.",
      };
    }

    default:
      return normalizedState;
  }
}

// ✅ Exported initial state must ALSO include items: []
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
