// src/reducers/securityEvents/securityEventInitialState.js

export const securityEventInitialState = {
  loading: false,
  cleanupLoading: false,
  actionLoading: false,

  error: null,
  cleanupMessage: "",
  actionMessage: "",

  items: [],
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,

  filters: {
    type: "",
    email: "",
    ip: "",
    reviewStatus: "",
    severity: "",
    category: "",
  },
};
