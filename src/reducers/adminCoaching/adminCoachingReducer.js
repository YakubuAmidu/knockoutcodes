import { ADMIN_COACHINGS_ACTIONS } from "./adminCoachingActionTypes";
import {
  ADMIN_COACHINGS_UI_KEY,
  adminCoachingsInitialState,
} from "./adminCoachingInitialState";

const ALLOWED_UI_KEYS = ["q", "page", "limit", "sort"];

function cleanUI(ui = {}) {
  return {
    q: String(ui.q || "").trim().slice(0, 60),
    page: Math.max(1, Number(ui.page) || 1),
    limit: Math.min(100, Math.max(10, Number(ui.limit) || 20)),
    sort: ui.sort === "createdAt" ? "createdAt" : "-createdAt",
  };
}

function persistUI(ui) {
  try {
    if (typeof window === "undefined") return;

    const cleaned = cleanUI(ui);
    const safe = {};

    for (const key of ALLOWED_UI_KEYS) {
      safe[key] = cleaned[key];
    }

    localStorage.setItem(ADMIN_COACHINGS_UI_KEY, JSON.stringify(safe));
  } catch {
    // Ignore localStorage errors.
  }
}

function upsert(items = [], nextItem) {
  const id = String(nextItem?._id || "");
  if (!id) return Array.isArray(items) ? items : [];

  const safeItems = Array.isArray(items) ? items : [];
  const idx = safeItems.findIndex((x) => String(x?._id || "") === id);

  if (idx === -1) return [nextItem, ...safeItems];

  const copy = safeItems.slice();
  copy[idx] = { ...copy[idx], ...nextItem };

  return copy;
}

export function adminCoachingsReducer(
  state = adminCoachingsInitialState,
  action = {}
) {
  switch (action.type) {
    case ADMIN_COACHINGS_ACTIONS.HYDRATE_UI: {
      const next =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : {};

      const nextUI = cleanUI({ ...state.ui, ...next });
      persistUI(nextUI);

      return { ...state, ui: nextUI };
    }

    case ADMIN_COACHINGS_ACTIONS.SET_UI_FIELD: {
      const { name, value } = action.payload || {};

      if (!ALLOWED_UI_KEYS.includes(name)) return state;

      const nextUI = cleanUI({ ...state.ui, [name]: value });
      persistUI(nextUI);

      return { ...state, ui: nextUI };
    }

    case ADMIN_COACHINGS_ACTIONS.FETCH_START:
      return {
        ...state,
        status: { state: "loading", message: "" },
      };

    case ADMIN_COACHINGS_ACTIONS.FETCH_SUCCESS: {
      const payload =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : {};

      const items = Array.isArray(payload.items) ? payload.items : [];
      const total = Number.isFinite(Number(payload.total))
        ? Math.max(0, Number(payload.total))
        : items.length;

      return {
        ...state,
        data: { items, total },
        status: { state: "success", message: "" },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.FETCH_ERROR: {
      const msg = String(action.payload || "Failed to fetch coachings.");

      return {
        ...state,
        status: { state: "error", message: msg },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.UPSERT_ITEM: {
      const item = action.payload;

      return {
        ...state,
        data: {
          ...state.data,
          items: upsert(state.data?.items, item),
          total:
            state.data?.items?.some(
              (x) => String(x?._id || "") === String(item?._id || "")
            )
              ? state.data.total
              : Number(state.data?.total || 0) + 1,
        },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.REMOVE_ITEM: {
      const id = String(action.payload || "");
      if (!id) return state;

      const currentItems = Array.isArray(state.data?.items)
        ? state.data.items
        : [];

      const existed = currentItems.some((x) => String(x?._id || "") === id);

      return {
        ...state,
        data: {
          ...state.data,
          items: currentItems.filter((x) => String(x?._id || "") !== id),
          total: existed
            ? Math.max(0, Number(state.data?.total || 0) - 1)
            : Math.max(0, Number(state.data?.total || 0)),
        },
      };
    }

    case ADMIN_COACHINGS_ACTIONS.SET_SELECTED_ID:
      return {
        ...state,
        selectedId: action.payload ? String(action.payload) : null,
      };

    case ADMIN_COACHINGS_ACTIONS.RESET_STATUS:
      return {
        ...state,
        status: { state: "idle", message: "" },
      };

    default:
      return state;
  }
}