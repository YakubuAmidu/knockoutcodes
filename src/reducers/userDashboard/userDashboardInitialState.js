// =========== Userdashboard InitialState =========
export const userDashboardInitialState = {
  loading: true,
  error: "",

  // ========= Filter ==============
  timeRange: "7h",


  // ======== Main Dashboard Payload ===========
  stats: {
    streakDays: 0,
    completedCount: 0,
    progressPercent: 0,
  },

  // ===== Right Side Panel Content =========
  notifications: [],

  // ===== Left Side Panel Content ========
  recentActivity: [],

  // ====== Next Move Actions ========
  nextSteps: [],
}