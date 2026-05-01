import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_ANALYTICS_ACTIONS } from "./emailAnalyticsActionTypes";

export const fetchEmailAnalytics = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_ANALYTICS_ACTIONS.FETCH_REQUEST });

    const { data } = await axiosInstance.get(
      "/admin/email-campaigns/analytics/overview"
    );

    dispatch({
      type: EMAIL_ANALYTICS_ACTIONS.FETCH_SUCCESS,
      payload: data?.data || null,
    });
  } catch (error) {
    dispatch({
      type: EMAIL_ANALYTICS_ACTIONS.FETCH_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch analytics",
    });
  }
};

export const fetchEmailCampaignAnalyticsById = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_ANALYTICS_ACTIONS.FETCH_REQUEST });

    const { data } = await axiosInstance.get(
      `/admin/email-campaigns/analytics/${id}`
    );

    dispatch({
      type: EMAIL_ANALYTICS_ACTIONS.FETCH_SUCCESS,
      payload: data?.data || data,
    });
  } catch (error) {
    dispatch({
      type: EMAIL_ANALYTICS_ACTIONS.FETCH_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch campaign analytics",
    });
  }
};

export const clearEmailAnalyticsError = () => ({
  type: EMAIL_ANALYTICS_ACTIONS.CLEAR_ERROR,
});