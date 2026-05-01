export const manageContactInitialState = {
  contacts: [],
  loading: false,
  saving: false,
  error: "",

  selectedId: null,

  // Form mirrors your existing component
  form: {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    status: "new",
    isSeen: false,
    replied: false,
    replyNote: "",
    deleting: false,
    bulkUpdating: false,
  },

  /**
   * ✅ Protection:
   * requestId lets us ignore stale/out-of-order responses
   * (example: user navigates fast, or two requests overlap).
   */
  fetchRequestId: null,
  saveRequestId: null,

  // Useful timestamps for UI effects/toasts
  lastFetchedAt: null,
  lastSavedAt: null,
};
