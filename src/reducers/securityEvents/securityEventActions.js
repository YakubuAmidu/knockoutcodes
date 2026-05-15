// src/reducers/securityEvents/securityEventActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { SECURITY_EVENT_ACTIONS } from "./securityEventActionTypes";

export const fetchSecurityEvents =
  ({ page = 1, limit = 20, type = "", email = "", reviewStatus = "" } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_START });

      const params = new URLSearchParams();

      params.set("page", page);
      params.set("limit", limit);

      if (type) params.set("type", type);
      if (email) params.set("email", email);
      if (reviewStatus) params.set("reviewStatus", reviewStatus);

      const { data } = await axiosInstance.get(
        `/security-events?${params.toString()}`
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch security events.";

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

      const { data } = await axiosInstance.patch(
        `/security-events/${id}/review`,
        payload
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update security event review.";

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const deleteSecurityEvent =
  (id) =>
  async (dispatch) => {
    try {
      dispatch({
        type: SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_START,
      });

      const { data } = await axiosInstance.delete(`/security-events/${id}`, {
        headers: {
          "Content-Type": "application/json"
        },
        data: {}
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
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete security event.";

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
        `/security-events/${id}/deactivate-user`,
        payload
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to deactivate user from security event.";

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

      const { data } = await axiosInstance.patch(
        `/security-events/${id}/block-ip`,
        payload
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to block IP from security event.";

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
        `/security-events/${id}/unblock-ip`,
        payload
      );

      dispatch({
        type: SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to unblock IP from security event.";

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

      const { data } = await axiosInstance.delete("/security-events/cleanup", {
        data: { days },
      });

      dispatch({
        type: SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to cleanup security events.";

      dispatch({
        type: SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_FAIL,
        payload: message,
      });

      throw error;
    }
  };

export const setSecurityEventFilters = (filters) => ({
  type: SECURITY_EVENT_ACTIONS.SET_SECURITY_EVENT_FILTERS,
  payload: filters,
});

export const clearSecurityEventError = () => ({
  type: SECURITY_EVENT_ACTIONS.CLEAR_SECURITY_EVENT_ERROR,
});

export const resetSecurityEvents = () => ({
  type: SECURITY_EVENT_ACTIONS.RESET_SECURITY_EVENTS,
});