import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_SUBSCRIBER_ACTIONS } from "./emailSubscriberActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const BASE_URL = "/admin/email-subscribers";

export const fetchEmailSubscribers = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.LIST_REQUEST });

    const { data } = await axiosInstance.get(BASE_URL);

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.LIST_SUCCESS,
      payload: data?.data || data?.subscribers || [],
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.LIST_FAIL,
      payload: getErrorMessage(error, "Failed to fetch subscribers"),
    });
  }
};

export const updateEmailSubscriber = (id, formData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(`${BASE_URL}/${id}`, formData);

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_SUCCESS,
      payload: {
        subscriber: data?.data || data?.subscriber,
        message: data?.message || "Subscriber updated successfully",
      },
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.UPDATE_FAIL,
      payload: getErrorMessage(error, "Failed to update subscriber"),
    });
  }
};

export const blockEmailSubscriber = (id, isBlocked) => async (dispatch) => {
  return dispatch(
    updateEmailSubscriber(id, {
      isBlocked,
      status: isBlocked ? "blocked" : "active",
    })
  );
};

export const deleteEmailSubscriber = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(`${BASE_URL}/${id}`);

    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SUBSCRIBER_ACTIONS.DELETE_FAIL,
      payload: getErrorMessage(error, "Failed to delete subscriber"),
    });
  }
};

export const setSelectedEmailSubscriber = (subscriber) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_SELECTED_SUBSCRIBER,
  payload: subscriber,
});

export const clearSelectedEmailSubscriber = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.CLEAR_SELECTED_SUBSCRIBER,
});

export const setEmailSubscriberSearch = (value) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_SEARCH,
  payload: value,
});

export const setEmailSubscriberFilter = (value) => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.SET_FILTER,
  payload: value,
});

export const clearEmailSubscriberError = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.CLEAR_ERROR,
});

export const resetEmailSubscriberSuccess = () => ({
  type: EMAIL_SUBSCRIBER_ACTIONS.RESET_SUCCESS,
});
