import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_CAMPAIGN_ACTIONS } from "./emailCampaignActionTypes";

const ADMIN_EMAIL_CAMPAIGN_URL = "/admin/email-campaigns";

export const fetchEmailCampaigns =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.LIST_REQUEST });

      const response = await axiosInstance.get(ADMIN_EMAIL_CAMPAIGN_URL, {
        params,
      });

      // Handles both:
      // 1. Normal axios: response.data
      // 2. Custom axiosInstance that already returns response.data
      const body =
        response?.data?.success !== undefined ? response.data : response;

      const campaigns =
        body?.campaigns ||
        body?.data?.campaigns ||
        body?.data ||
        body?.results ||
        [];

      dispatch({
        type: EMAIL_CAMPAIGN_ACTIONS.LIST_SUCCESS,
        payload: Array.isArray(campaigns) ? campaigns : [],
        meta: body?.pagination || body?.data?.pagination || null,
      });

      return body;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch campaigns";

      dispatch({
        type: EMAIL_CAMPAIGN_ACTIONS.LIST_FAIL,
        payload: message,
      });

      return null;
    }
  };

export const createEmailCampaign = (campaignData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post(
      ADMIN_EMAIL_CAMPAIGN_URL,
      campaignData,
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.CREATE_SUCCESS,
      payload: data?.data,
    });

    return data?.data || null;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to create campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.CREATE_FAIL,
      payload: message,
    });

    return null;
  }
};

export const updateEmailCampaign = (id, campaignData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(
      `${ADMIN_EMAIL_CAMPAIGN_URL}/${id}`,
      campaignData,
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_SUCCESS,
      payload: data?.data,
    });

    return data?.data || null;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to update campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return null;
  }
};

export const scheduleEmailCampaign = (id, scheduledFor) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(
      `${ADMIN_EMAIL_CAMPAIGN_URL}/${id}/schedule`,
      { scheduledFor },
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_SUCCESS,
      payload: data?.data,
    });

    return data?.data || null;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to schedule campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return null;
  }
};

export const pauseEmailCampaign = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(
      `${ADMIN_EMAIL_CAMPAIGN_URL}/${id}/pause`,
      {},
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_SUCCESS,
      payload: data?.data,
    });

    return data?.data || null;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to pause campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return null;
  }
};

export const sendEmailCampaign = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.SEND_REQUEST });

    const { data } = await axiosInstance.post(
      `${ADMIN_EMAIL_CAMPAIGN_URL}/${id}/send`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "X-Request-Intent": "admin-email-campaign-send",
        },
        withCredentials: true,
      },
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.SEND_SUCCESS,
      payload: data?.data || null,
    });

    return data?.data || true;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to send campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.SEND_FAIL,
      payload: message,
    });

    return null;
  }
};

export const deleteEmailCampaign = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_CAMPAIGN_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(`${ADMIN_EMAIL_CAMPAIGN_URL}/${id}`);

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });

    return true;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to delete campaign";

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.DELETE_FAIL,
      payload: message,
    });

    return false;
  }
};

export const fetchEmailCampaignAnalytics = () => async (dispatch) => {
  try {
    const { data } = await axiosInstance.get(
      `${ADMIN_EMAIL_CAMPAIGN_URL}/analytics/overview`,
    );

    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.ANALYTICS_SUCCESS,
      payload: data?.data || null,
    });

    return data?.data || null;
  } catch (error) {
    dispatch({
      type: EMAIL_CAMPAIGN_ACTIONS.ANALYTICS_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load analytics",
    });

    return null;
  }
};

export const setSelectedEmailCampaign = (campaign) => ({
  type: EMAIL_CAMPAIGN_ACTIONS.SET_SELECTED,
  payload: campaign,
});

export const clearEmailCampaignError = () => ({
  type: EMAIL_CAMPAIGN_ACTIONS.CLEAR_ERROR,
});

export const resetEmailCampaignSuccess = () => ({
  type: EMAIL_CAMPAIGN_ACTIONS.RESET_SUCCESS,
});
