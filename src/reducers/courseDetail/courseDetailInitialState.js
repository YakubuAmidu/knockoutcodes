// src/reducers/courseDetail/courseDetailInitialState.js

export const courseDetailInitialState = {
  loading: false,
  accessLoading: false,
  checkoutLoading: false,

  course: null,
  hasAccess: false,
  accessType: null,

  checkoutUrl: null,

  error: null,
  successMessage: null,
};