export const ADMIN_COACHINGS_UI_KEY = "kc_admin_coachings_ui";

/**
 * We ONLY persist non-sensitive UI state:
 * - q, page, limit, sort
 * We do NOT store: items, fullName, email, phone, etc.
 */
const ALLOWED_UI_KEYS = ["q", "page", "limit", "sort"];

function cleanUI(ui = {}) {
  return {
    q: String(ui.q || "")
      .trim()
      .slice(0, 60),
    page: Math.max(1, Number(ui.page) || 1),
    limit: Math.min(100, Math.max(10, Number(ui.limit) || 20)),
    sort: ui.sort === "createdAt" ? "createdAt" : "-createdAt",
  };
}

function safeParseUI(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};

    const cleaned = {};

    for (const key of ALLOWED_UI_KEYS) {
      if (key in parsed) cleaned[key] = parsed[key];
    }

    return cleanUI(cleaned);
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
    q: uiDraft.q || "",
    page: uiDraft.page || 1,
    limit: uiDraft.limit || 20,
    sort: uiDraft.sort || "-createdAt",
  },

  data: {
    items: [],
    total: 0,
  },

  selectedId: null,

  status: {
    state: "idle",
    message: "",
  },
};
