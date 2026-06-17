// ======= UserDashboardActions =========
import * as T from "./userDashboardActionTypes";

// ======= Fetch Dashboard =======
export const userDashboardRequest = () => ({ type: T.USER_DASHBOARD_REQUEST });

export const userDashboardSuccess = (payload) => ({
  type: T.USER_DASHBOARD_SUCCESS,
  payload,
});

export const userDashboardFail = (message) => ({
  type: T.USER_DASHBOARD_FAIL,
  payload: message,
});

// ======= UI / UX Actions =======
export const setDashboardTimeRange = (range) => ({
  type: T.USER_DASHBOARD_SET_TIME_RANGE,
  payload: range,
});

export const markNotificationRead = (notificationId) => ({
  type: T.USER_DASHBOARD_MARK_NOTIFICATION_READ,
  payload: notificationId,
});

export const clearDashboardError = () => ({
  type: T.USER_DASHBOARD_CLEAR_ERROR,
});
