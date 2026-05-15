// src/reducers/systemSettings/systemSettingInitialState.js

export const systemSettingInitialState = {
  loading: false,
  updating: false,
  hasLoaded: false,

  maintenanceMode: false,
  maintenanceTitle: "KnockoutCodes is upgrading",
  maintenanceMessage:
    "We are improving the training room. Please check back shortly.",
  allowAdminAccess: true,
  updatedAt: null,

  successMessage: null,
  error: null,
};