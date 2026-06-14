// src/reducers/systemSettings/systemSettingActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { SYSTEM_SETTING_ACTIONS } from "./systemSettingActionTypes";

let systemStatusPromise = null;
let lastSystemStatusFetch = 0;

const SYSTEM_STATUS_COOLDOWN = 60 * 1000; // 1 minute

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeStatus = (data = {}) => ({
  maintenanceMode: Boolean(data.maintenanceMode ?? data.data?.maintenanceMode),
  maintenanceTitle:
    data.maintenanceTitle || data.data?.maintenanceTitle || "",
  maintenanceMessage:
    data.maintenanceMessage || data.data?.maintenanceMessage || "",
  allowAdminAccess:
    data.allowAdminAccess ?? data.data?.allowAdminAccess ?? true,
  updatedAt: data.updatedAt || data.data?.updatedAt || null,
});

export const fetchSystemStatus = (options = {}) => async (dispatch, getState) => {
  const force = Boolean(options.force);

  const state = getState?.();
  const alreadyLoaded = state?.systemSettings?.hasLoaded;
  const now = Date.now();

  if (
    !force &&
    alreadyLoaded &&
    now - lastSystemStatusFetch < SYSTEM_STATUS_COOLDOWN
  ) {
    return {
      success: true,
      skipped: true,
      data: state.systemSettings,
    };
  }

  if (systemStatusPromise && !force) {
    return systemStatusPromise;
  }

  systemStatusPromise = (async () => {
    try {
      dispatch({
        type: SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_REQUEST,
      });

      const res = await axiosInstance.get("/system/status", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = normalizeStatus(res.data);

      lastSystemStatusFetch = Date.now();

      dispatch({
        type: SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_SUCCESS,
        payload: data,
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      const status = error?.response?.status;

      const message =
        status === 429
          ? "System status is being checked too often. Please wait a moment."
          : getErrorMessage(error, "Failed to load system status.");

      dispatch({
        type: SYSTEM_SETTING_ACTIONS.SYSTEM_STATUS_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    } finally {
      systemStatusPromise = null;
    }
  })();

  return systemStatusPromise;
};

export const updateMaintenanceMode = (payload) => async (dispatch) => {
  try {
    dispatch({
      type: SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_REQUEST,
    });

    const res = await axiosInstance.put("/system/maintenance", payload);

    const data = normalizeStatus(res.data);

    dispatch({
      type: SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_SUCCESS,
      payload: {
        ...data,
        message: res.data?.message,
      },
    });

    lastSystemStatusFetch = 0;

    return {
      success: true,
      data,
      message: res.data?.message,
    };
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Failed to update maintenance mode."
    );

    dispatch({
      type: SYSTEM_SETTING_ACTIONS.UPDATE_MAINTENANCE_FAIL,
      payload: message,
    });

    return {
      success: false,
      message,
    };
  }
};

export const clearSystemSettingMessages = () => ({
  type: SYSTEM_SETTING_ACTIONS.CLEAR_SYSTEM_SETTING_MESSAGES,
});

export const receiveMaintenanceSocketUpdate = (payload) => ({
  type: SYSTEM_SETTING_ACTIONS.SYSTEM_MAINTENANCE_SOCKET_UPDATE,
  payload: normalizeStatus(payload),
});