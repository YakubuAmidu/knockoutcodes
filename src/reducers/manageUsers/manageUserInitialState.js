// src/reducers/manageUsers/manageUserInitialState.js

export const manageUserInitialState = {
  users: [],
  selectedUser: null,

  /* =========================
     Loading States
  ========================= */
  loading: false,
  loadingUser: false,

  updating: false,
  changingStatus: false,
  forceLoggingOut: false,

  softDeleting: false,
  restoring: false,
  deleting: false,

  /* =========================
     Global State
  ========================= */
  success: false,
  error: null,

  successMessage: "",
  errorMessage: "",

  /* =========================
     Search + Filters
  ========================= */
  search: "",
  filter: "all",

  /* =========================
     UI Feedback
  ========================= */
  systemMessage: {
    type: null,
    text: "",
  },

  /* =========================
     Luxury Analytics Cards
  ========================= */
  analytics: {
    total: 0,

    active: 0,
    suspended: 0,
    onHold: 0,
    banned: 0,
    deactivated: 0,

    admins: 0,
    deleted: 0,

    verifiedUsers: 0,
    unverifiedUsers: 0,
  },
};
