// src/reducers/contact/contactReducer.js

import { CONTACT_ACTIONS } from "./contactActionTypes";
import { CONTACT_STORAGE_KEY, contactInitialState } from "./contactInitialState";

// ✅ Only store safe fields (non-PII)
const ALLOWED_DRAFT_KEYS = ["subject", "message"];

// ✅ Persist draft safely (never throws, never saves PII)
function persistDraft(form) {
  try {
    if (typeof window === "undefined") return;

    const safe = {};
    for (const k of ALLOWED_DRAFT_KEYS) safe[k] = form[k];

    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore (private mode, storage full, etc.)
  }
}

// ✅ Clear saved draft after successful submit
function clearDraftStorage() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CONTACT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function contactReducer(state = contactInitialState, action) {
  switch (action.type) {
    case CONTACT_ACTIONS.HYDRATE_FROM_STORAGE: {
      const next =
        action.payload && typeof action.payload === "object" ? action.payload : {};
      const nextForm = { ...state.form, ...next };
      persistDraft(nextForm);
      return { ...state, form: nextForm };
    }

    case CONTACT_ACTIONS.UPDATE_FIELD: {
      const { name, value } = action.payload || {};
      if (!name) return state;

      const nextForm = { ...state.form, [name]: value };
      persistDraft(nextForm);
      return { ...state, form: nextForm };
    }

    case CONTACT_ACTIONS.SET_STATUS: {
      const nextStatus =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : { state: "idle", message: "" };

      return { ...state, status: nextStatus };
    }

    case CONTACT_ACTIONS.RESET_AFTER_SUCCESS: {
      /**
       * ✅ SECURITY + UX:
       * - Clear the ENTIRE form (including PII) after successful submit
       * - Also clear localStorage draft so old subject/message never re-appear
       */
      clearDraftStorage();

      return {
        ...state,
        form: { ...contactInitialState.form },
        status: { state: "success", message: "" },
      };
    }

    case CONTACT_ACTIONS.RESET_ALL: {
      persistDraft(contactInitialState.form);
      return contactInitialState;
    }

    default:
      return state;
  }
}
