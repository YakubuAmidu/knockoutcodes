// src/reducers/adminCoachings/adminCoachingsReducer.js
import { ADMIN_COACHINGS_ACTIONS } from "./adminCoachingActionTypes";
import {
  ADMIN_COACHINGS_UI_KEY,
  adminCoachingsInitialState,
} from "./adminCoachingInitialState";

const ALLOWED_UI_KEYS = ["q", "page", "limit", "sort"];

function persistUI(ui) {
  try {
    if (typeof window === "undefined") return;
    const safe = {};
    for (const k of ALLOWED_UI_KEYS) safe[k] = ui[k];
    localStorage.setItem(ADMIN_COACHINGS_UI_KEY, JSON.stringify(safe));
  } catch {
    // ignore
  }
};

function upsert(items, nextItem) {
  const id = String(nextItem?._id || "");
  if (!id) return items;

  const idx = items.findIndex((x) => String(x?._id) === id);
  if (idx === -1) return [nextItem, ...items];

  const copy = items.slice();
  copy[idx] = { ...copy[idx], ...nextItem };
  return copy;
}

export function adminCoachingsReducer(state = adminCoachingsInitialState, action) {
  switch (action.type) {
    case ADMIN_COACHINGS_ACTIONS.HYDRATE_UI: {
      const next =
        action.payload && typeof action.payload === "object" ? action.payload : {};
      const nextUI = { ...state.ui, ...next };
      persistUI(nextUI);
      return { ...state, ui: nextUI };
    }

    case ADMIN_COACHINGS_ACTIONS.SET_UI_FIELD: {
      const { name, value } = action.payload || {};
      if (!name) return state;

      const nextUI = { ...state.ui, [name]: value };
      persistUI(nextUI);
      return { ...state, ui: nextUI };
    }

    case ADMIN_COACHINGS_ACTIONS.FETCH_START:
      return { ...state, status: { state: "loading", message: "" } };

    case ADMIN_COACHINGS_ACTIONS.FETCH_SUCCESS: {
      const payload =
        action.payload && typeof action.payload === "object" ? action.payload : {};
      const items = Array.isArray(payload.items) ? payload.items : [];
      const total = Number.isFinite(Number(payload.total)) ? Number(payload.total) : 0;

      return {
        ...state,
        data: { items, total },
        status: { state: "success", message: "" },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.FETCH_ERROR: {
      const msg = String(action.payload || "Failed to fetch coachings.");
      return { ...state, status: { state: "error", message: msg } };
    }

    case ADMIN_COACHINGS_ACTIONS.UPSERT_ITEM: {
      const item = action.payload;
      return {
        ...state,
        data: { ...state.data, items: upsert(state.data.items, item) },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.REMOVE_ITEM: {
      const id = String(action.payload || "");
      if (!id) return state;

      return {
        ...state,
        data: {
          ...state.data,
          items: state.data.items.filter((x) => String(x?._id) !== id),
          total: Math.max(0, (state.data.total || 0) - 1),
        },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.SET_SELECTED_ID:
      return { ...state, selectedId: action.payload || null };

    case ADMIN_COACHINGS_ACTIONS.RESET_STATUS:
      return { ...state, status: { state: "idle", message: "" } };

    default:
      return state;
  }
}
