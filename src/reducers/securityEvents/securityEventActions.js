// src/reducers/securityEvents/securityEventActions.js
import axiosInstance from "../../../utils/axiosInstance";
import { SECURITY_EVENT_ACTIONS } from "./securityEventActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const cleanText = (value = "", max = 200) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);

const getPayloadItem = (data) => data?.data || data?.item || null;

const BASE_URL = "/security-events";

export const fetchSecurityEvents =
  ({
    page = 1,
    limit = 20,
    type = "",
    email = "",
    ip = "",
    reviewStatus = "",
    severity = "",
    category = "",
  } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_START });

      const params = new URLSearchParams();

      params.set("page", Math.max(Number(page) || 1, 1));
      params.set("limit", Math.min(Math.max(Number(limit) || 20, 10), 100));

      if (type) params.set("type", cleanText(type, 80));
      if (email) params.set("email", cleanText(email, 120));
      if (ip) params.set("ip", cleanText(ip, 80));
      if (reviewStatus) params.set("reviewStatus", cleanText(reviewStatus, 40));
      if (severity) params.set("severity", cleanText(severity, 40));
      if (category) params.set("category", cleanText(category, 40));

      const { data } = await axiosInstance.get(
        `${BASE_URL}?${params.toString()}`,
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch security events.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const updateSecurityEventReview =
  (id, payload = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_START,
      });

      const body = {
        reviewStatus: cleanText(payload.reviewStatus || "reviewed", 40),
        adminNote: cleanText(payload.adminNote || "", 1000),
      };

      const { data } = await axiosInstance.patch(
        `${BASE_URL}/${id}/review`,
        body,
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_SUCCESS,
        payload: {
          ...data,
          item: getPayloadItem(data),
        },
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to update security event review.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const deleteSecurityEvent = (id) => async (dispatch) => {
  try {
    dispatch({
      type: SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_START,
    });

    const { data } = await axiosInstance.delete(`${BASE_URL}/${id}`, {
      data: {},
    });

    dispatch({
      type: SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_SUCCESS,
      payload: {
        ...data,
        deletedId: data?.deletedId || id,
      },
    });

    return data;
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete security event.");

    dispatch({
      type: SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_FAIL,
      payload: message,
    });

    throw error;
  }
};

export const deactivateSecurityEventUser =
  (id, payload = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_START,
      });

      const { data } = await axiosInstance.patch(
        `${BASE_URL}/${id}/deactivate-user`,
        {
          adminNote: cleanText(payload.adminNote || "", 1000),
        },
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_SUCCESS,
        payload: {
          ...data,
          item: getPayloadItem(data),
          eventId: id,
        },
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to deactivate user from security event.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const blockSecurityEventIp =
  (id, payload = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_START,
      });

      const { data } = await axiosInstance.patch(`${BASE_URL}/${id}/block-ip`, {
        reason: cleanText(payload.reason || "", 500),
        adminNote: cleanText(payload.adminNote || "", 1000),
      });

      dispatch({
        type: SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_SUCCESS,
        payload: {
          ...data,
          item: getPayloadItem(data),
          eventId: id,
        },
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to block IP from security event.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const unblockSecurityEventIp =
  (id, payload = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_START,
      });

      const { data } = await axiosInstance.patch(
        `${BASE_URL}/${id}/unblock-ip`,
        {
          adminNote: cleanText(payload.adminNote || "", 1000),
        },
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_SUCCESS,
        payload: {
          ...data,
          item: getPayloadItem(data),
          eventId: id,
        },
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to unblock IP from security event.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const cleanupSecurityEvents =
  ({ days = 90 } = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_START,
      });

      const safeDays = Math.min(Math.max(Number(days) || 90, 30), 365);

      const { data } = await axiosInstance.delete(`${BASE_URL}/cleanup`, {
        data: { days: safeDays },
      });

      dispatch({
        type: SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to cleanup security events.",
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const setSecurityEventFilters = (filters = {}) => ({
  type: SECURITY_EVENT_ACTIONS.SET_SECURITY_EVENT_FILTERS,
  payload: filters,
});

export const clearSecurityEventError = () => ({
  type: SECURITY_EVENT_ACTIONS.CLEAR_SECURITY_EVENT_ERROR,
});

export const clearSecurityEventMessages = () => ({
  type: SECURITY_EVENT_ACTIONS.CLEAR_SECURITY_EVENT_MESSAGES,
});

export const resetSecurityEvents = () => ({
  type: SECURITY_EVENT_ACTIONS.RESET_SECURITY_EVENTS,
});
