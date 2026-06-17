// src/reducers/userDashboard/userDashboardReducer.js
import { userDashboardInitialState } from "./userDashboardInitialState";
import * as T from "./userDashboardActionTypes";

/**
 * ✅ Helper: safe numbers (prevents NaN from breaking UI)
 */
const n = (val) => (Number.isFinite(Number(val)) ? Number(val) : 0);

/**
 * ✅ Helper: normalize dashboard payload from backend (professional)
 * This prevents "undefined" crashes in UI.
 */
function normalizeDashboardPayload(payload) {
  const p = payload || {};

  const stats = p.stats || {};
  return {
    stats: {
      streakDays: n(stats.streakDays),
      completedCount: n(stats.completedCount),
      savedCount: n(stats.savedCount),
      notificationsCount: n(stats.notificationsCount),
      progressPercent: n(stats.progressPercent),
    },
    notifications: Array.isArray(p.notifications) ? p.notifications : [],
    recentActivity: Array.isArray(p.recentActivity) ? p.recentActivity : [],
    nextSteps: Array.isArray(p.nextSteps) ? p.nextSteps : [],
  };
}

export function userDashboardReducer(
  state = userDashboardInitialState,
  action,
) {
  switch (action.type) {
    // ===== fetch =====
    case T.USER_DASHBOARD_REQUEST: {
      return { ...state, loading: true, error: "" };
    }

    case T.USER_DASHBOARD_SUCCESS: {
      const normalized = normalizeDashboardPayload(action.payload);

      return {
        ...state,
        loading: false,
        error: "",
        ...normalized,
      };
    }

    case T.USER_DASHBOARD_FAIL: {
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load dashboard.",
      };
    }

    // ===== filters =====
    case T.USER_DASHBOARD_SET_TIME_RANGE: {
      const range = action.payload;

      // keep it strict (professional)
      const allowed = ["7d", "30d", "90d"];
      const safeRange = allowed.includes(range) ? range : "7d";

      return { ...state, timeRange: safeRange };
    }

    // ===== notifications =====
    case T.USER_DASHBOARD_MARK_NOTIFICATION_READ: {
      const id = action.payload;

      const notifications = state.notifications.map((n) =>
        n?._id === id || n?.id === id ? { ...n, read: true } : n,
      );

      // keep counts consistent (premium feel)
      const unreadCount = notifications.filter((x) => !x?.read).length;

      return {
        ...state,
        notifications,
        stats: { ...state.stats, notificationsCount: unreadCount },
      };
    }

    case T.USER_DASHBOARD_CLEAR_ERROR: {
      return { ...state, error: "" };
    }

    default:
      return state;
  }
}
