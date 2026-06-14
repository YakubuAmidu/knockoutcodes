// src/reducers/contact/contactReducer.js

import { CONTACT_ACTIONS } from "./contactActionTypes";
import { CONTACT_STORAGE_KEY, contactInitialState } from "./contactInitialState";

const ALLOWED_DRAFT_KEYS = ["subject", "message"];

function persistDraft(form) {
  try {
    if (typeof window === "undefined") return;

    const safe = {};

    for (const key of ALLOWED_DRAFT_KEYS) {
      safe[key] = String(form?.[key] || "");
    }

    if (!safe.subject && !safe.message) {
      localStorage.removeItem(CONTACT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore storage issues
  }
}

function clearDraftStorage() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CONTACT_STORAGE_KEY);
  } catch {
    // ignore storage issues
  }
}

export function contactReducer(state = contactInitialState, action) {
  switch (action.type) {
    case CONTACT_ACTIONS.HYDRATE_FROM_STORAGE: {
      const next =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : {};

      const nextForm = {
        ...state.form,
        subject: String(next.subject || state.form?.subject || ""),
        message: String(next.message || state.form?.message || ""),
      };

      persistDraft(nextForm);

      return {
        ...state,
        form: nextForm,
      };
    }

    case CONTACT_ACTIONS.UPDATE_FIELD: {
      const { name, value } = action.payload || {};

      if (!name) return state;

      const nextForm = {
        ...state.form,
        [name]: value,
      };

      persistDraft(nextForm);

      return {
        ...state,
        form: nextForm,
      };
    }

    case CONTACT_ACTIONS.SET_STATUS: {
      const nextStatus =
        action.payload && typeof action.payload === "object"
          ? {
              state: action.payload.state || "idle",
              message: action.payload.message || "",
            }
          : { state: "idle", message: "" };

      return {
        ...state,
        status: nextStatus,
      };
    }

    case CONTACT_ACTIONS.CLEAR_STATUS: {
      return {
        ...state,
        status: { state: "idle", message: "" },
      };
    }

    case CONTACT_ACTIONS.RESET_FORM: {
      clearDraftStorage();

      return {
        ...state,
        form: { ...contactInitialState.form },
        status: { state: "idle", message: "" },
      };
    }

    case CONTACT_ACTIONS.RESET_AFTER_SUCCESS: {
      clearDraftStorage();

      return {
        ...state,
        form: { ...contactInitialState.form },
        status: { state: "success", message: "" },
      };
    }

    case CONTACT_ACTIONS.RESET_ALL: {
      clearDraftStorage();

      return {
        ...contactInitialState,
        form: { ...contactInitialState.form },
        status: { ...contactInitialState.status },
      };
    }

    default:
      return state;
  }
}