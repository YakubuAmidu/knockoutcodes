import axiosInstance from "../../utils/axiosInstance";
import { EMAIL_DASHBOARD_ACTIONS } from "./emailDashboardActionTypes";

export const fetchEmailDashboard = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_DASHBOARD_ACTIONS.FETCH_REQUEST });

    const { data } = await axiosInstance.get(
      "/email-campaigns/admin/dashboard",
    );

    dispatch({
      type: EMAIL_DASHBOARD_ACTIONS.FETCH_SUCCESS,
      payload: data?.data || data,
    });
  } catch (error) {
    dispatch({
      type: EMAIL_DASHBOARD_ACTIONS.FETCH_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load email dashboard",
    });
  }
};

export const clearEmailDashboardError = () => ({
  type: EMAIL_DASHBOARD_ACTIONS.CLEAR_ERROR,
});
