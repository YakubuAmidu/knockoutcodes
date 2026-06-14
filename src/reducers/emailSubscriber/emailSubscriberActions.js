import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_SUBSCRIBER_ACTIONS } from "./emailSubscriberActionTypes";

const BASE_URL = "/admin/email-subscribers";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchEmailSubscribers =
  (params = {}) =>
  async (dispatch, getState) => {
    try {
      dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.LIST_REQUEST });

      const state = getState()?.emailSubscribers || {};

      const queryParams = {
        page: params.page || state.pagination?.page || 1,
        limit: params.limit || state.pagination?.limit || 50,
        search: params.search ?? state.search ?? "",
        status:
          params.status || state.filter === "all" ? "" : state.filter || "",
        sort: params.sort || state.sort || "newest",
      };

      const { data } = await axiosInstance.get(BASE_URL, {
        params: queryParams,
      });

      dispatch({
        type: EMAIL_SUBSCRIBER_ACTIONS.LIST_SUCCESS,
        payload: {
          subscribers: data?.data || data?.subscribers || [],
          summary: data?.summary || {},
          pagination: data?.pagination || {},
        },
      });

      return { success: true, data };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to fetch email subscribers"
      );

      dispatch({
        type: EMAIL_SUBSCRIBER_ACTIONS.LIST_FAIL,
        payload: message,
      });

      return { success: false, message };
    }
  };

export const getEmailSubscriberDetails = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.DETAILS_REQUEST });

    const { data } = await axiosInstance.get(`${BASE_URL}/${id}`);

    const subscriber = data?.data || data?.subscriber;

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DETAILS_SUCCESS,
      payload: subscriber,
    });

    return { success: true, data: subscriber };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch subscriber details");

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DETAILS_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const createEmailSubscriber = (payload) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post(BASE_URL, payload);

    const subscriber = data?.data || data?.subscriber;

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.CREATE_SUCCESS,
      payload: subscriber,
    });

    return { success: true, data: subscriber };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create subscriber");

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.CREATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const updateEmailSubscriber = (id, payload) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(`${BASE_URL}/${id}`, payload);

    const subscriber = data?.data || data?.subscriber;

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_SUCCESS,
      payload: subscriber,
    });

    return { success: true, data: subscriber };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update subscriber");

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const deleteEmailSubscriber = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(`${BASE_URL}/${id}`);

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });

    return { success: true };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete subscriber");

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const bulkUpdateEmailSubscribers =
  ({ ids, status, reason = "" }) =>
  async (dispatch) => {
    try {
      dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_REQUEST });

      const { data } = await axiosInstance.put(`${BASE_URL}/bulk/status`, {
        ids,
        status,
        reason,
      });

      dispatch({
        type: EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_SUCCESS,
        payload: {
          subscribers: data?.data || data?.subscribers || [],
          message: data?.message,
        },
      });

      return { success: true, data };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to update selected subscribers"
      );

      dispatch({
        type: EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_FAIL,
        payload: message,
      });

      return { success: false, message };
    }
  };

export const bulkDeleteEmailSubscribers = (ids = []) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_REQUEST });

    const { data } = await axiosInstance.delete(`${BASE_URL}/bulk`, {
      data: { ids },
    });

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_SUCCESS,
      payload: {
        ids,
        message: data?.message,
      },
    });

    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Failed to delete selected subscribers"
    );

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const blockEmailSubscriber = (id, shouldBlock = true) => async (
  dispatch
) => {
  return dispatch(
    updateEmailSubscriber(id, {
      status: shouldBlock ? "blocked" : "active",
      blockedReason: shouldBlock ? "Blocked by admin" : "",
    })
  );
};

export const setSelectedEmailSubscriber = (subscriber) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_SELECTED,
  payload: subscriber,
});

export const clearSelectedEmailSubscriber = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.CLEAR_SELECTED,
});

export const setEmailSubscriberSearch = (value) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_SEARCH,
  payload: value,
});

export const setEmailSubscriberFilter = (value) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_FILTER,
  payload: value,
});

export const setEmailSubscriberSort = (value) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_SORT,
  payload: value,
});

export const clearEmailSubscriberError = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.CLEAR_ERROR,
});

export const resetEmailSubscriberSuccess = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.RESET_SUCCESS,
});