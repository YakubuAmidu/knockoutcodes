// src/reducers/adminCoachings/adminCoachingsInitialState.js

export const ADMIN_COACHINGS_UI_KEY = "kc_admin_coachings_ui";

/**
 * ✅ We ONLY persist non-sensitive UI state:
 * - q, page, limit, sort
 * We do NOT store: items, fullName, email, phone, etc.
 */
const ALLOWED_UI_KEYS = ["q", "page", "limit", "sort"];

function safeParseUI(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const cleaned = {};
    for (const k of ALLOWED_UI_KEYS) {
      if (k in parsed) cleaned[k] = parsed[k];
    }
    return cleaned;
  } catch {
    return {};
  }
}

const uiDraft =
  typeof window !== "undefined"
    ? safeParseUI(localStorage.getItem(ADMIN_COACHINGS_UI_KEY))
    : {};

export const adminCoachingsInitialState = {
  ui: {
    q: "",
    page: Number.isFinite(Number(uiDraft.page)) ? Math.max(1, Number(uiDraft.page)) : 1,
    limit: Number.isFinite(Number(uiDraft.limit)) ? Math.min(100, Math.max(10, Number(uiDraft.limit))) : 20,
    // "-createdAt" or "createdAt"
    sort: uiDraft.sort === "createdAt" ? "createdAt" : "-createdAt",
  },

  data: {
    items: [],
    total: 0,
  },

  selectedId: null,

  status: {
    state: "idle", // idle | loading | success | error
    message: "",
  },
};
