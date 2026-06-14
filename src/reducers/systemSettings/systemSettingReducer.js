// src/reducers/systemSettings/systemSettingReducer.js

import { SYSTEM_SETTING_ACTIONS } from "./systemSettingActionTypes";

export const systemSettingReducer = (state, action) => {
  switch (action.type) {
    case SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_SUCCESS:
  return {
    ...state,
    loading: false,
    hasLoaded: true,
    maintenanceMode: Boolean(action.payload.maintenanceMode),
    maintenanceTitle:
      action.payload.maintenanceTitle || state.maintenanceTitle,
    maintenanceMessage:
      action.payload.maintenanceMessage || state.maintenanceMessage,
    allowAdminAccess: action.payload.allowAdminAccess !== false,
    updatedAt: action.payload.updatedAt || null,
    error: null,
  };

    case SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_FAIL:
      return {
        ...state,
        loading: false,
        hasLoaded: true,
        error: action.payload,
      };
    
    case SYSTEM_SETTING_ACTIONS.SYSTEM_MAINTENANCE_SOCKET_UPDATE:
  return {
    ...state,
    hasLoaded: true,
    maintenanceMode: Boolean(action.payload.maintenanceMode),
    maintenanceTitle:
      action.payload.maintenanceTitle || state.maintenanceTitle,
    maintenanceMessage:
      action.payload.maintenanceMessage || state.maintenanceMessage,
    allowAdminAccess: action.payload.allowAdminAccess !== false,
    updatedAt: action.payload.updatedAt || state.updatedAt,
    error: null,
  };

    case SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        successMessage: null,
      };

    case SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_SUCCESS:
      return {
        ...state,
        updating: false,
        maintenanceMode: Boolean(action.payload.maintenanceMode),
        maintenanceTitle:
          action.payload.maintenanceTitle || state.maintenanceTitle,
        maintenanceMessage:
          action.payload.maintenanceMessage || state.maintenanceMessage,
        allowAdminAccess:
          action.payload.allowAdminAccess !== false,
        updatedAt: action.payload.updatedAt || null,
        successMessage: action.payload.message || "System settings updated.",
        error: null,
      };

    case SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case SYSTEM_SETTING_ACTIONS.CLEAR_SYSTEM_SETTING_MESSAGES:
      return {
        ...state,
        successMessage: null,
        error: null,
      };

    default:
      return state;
  }
};