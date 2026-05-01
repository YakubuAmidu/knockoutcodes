import { COACHING_ACTIONS } from "./coachingActionTypes";
import {
  COACHING_STORAGE_KEY,
  coachingInitialState,
  createCoachingInitialForm,
  createCoachingInitialState,
} from "./coachingInitialState";

const ALLOWED_DRAFT_KEYS = [
  "coachingType",
  "duration",
  "timeZone",
  "date",
  "time",
  "goals",
  "preferGoogleMeet",
  "acceptPolicies",
  "marketingOptIn",
];

function persistDraft(form) {
  try {
    if (typeof window === "undefined") return;

    const safe = {};
    for (const k of ALLOWED_DRAFT_KEYS) {
      safe[k] = form?.[k];
    }

    localStorage.setItem(COACHING_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore storage errors
  }
}

function clearDraftStorage() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(COACHING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function coachingReducer(state = coachingInitialState, action) {
  switch (action.type) {
    case COACHING_ACTIONS.HYDRATE_FROM_STORAGE: {
      const next =
        action.payload && typeof action.payload === "object" ? action.payload : {};

      const nextForm = { ...state.form, ...next };
      persistDraft(nextForm);

      return {
        ...state,
        form: nextForm,
      };
    }

    case COACHING_ACTIONS.UPDATE_FIELD: {
      const { name, value } = action.payload || {};
      if (!name) return state;

      const nextForm = { ...state.form, [name]: value };
      persistDraft(nextForm);

      return {
        ...state,
        form: nextForm,
      };
    }

    case COACHING_ACTIONS.SET_STATUS: {
      const nextStatus =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : { state: "idle", message: "" };

      return {
        ...state,
        status: nextStatus,
      };
    }

    case COACHING_ACTIONS.RESET_AFTER_SUCCESS: {
      /**
       * Clear the whole form after successful submit.
       * Keep the current timezone if one was already selected.
       * Also clear the saved draft so old values do not come back.
       */
      clearDraftStorage();

      const freshForm = createCoachingInitialForm();
      const nextForm = {
        ...freshForm,
        timeZone: state.form?.timeZone || freshForm.timeZone,
      };

      return {
        ...state,
        form: nextForm,
        status: { state: "success", message: "" },
      };
    }

    case COACHING_ACTIONS.RESET_ALL: {
      clearDraftStorage();

      return createCoachingInitialState();
    }

    default:
      return state;
  }
}