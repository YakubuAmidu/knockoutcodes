// src/reducers/emailSegment/emailSegmentActions.js
import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_SEGMENT_ACTIONS } from "./emailSegmentActionTypes";

const BASE_URL = "/admin/email-segments";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getSegmentsFromResponse = (data) =>
  data?.data || data?.segments || [];

/* =========================
   GET ALL SEGMENTS
========================= */
export const fetchEmailSegments = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.LIST_REQUEST });

    const { data } = await axiosInstance.get(BASE_URL);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.LIST_SUCCESS,
      payload: getSegmentsFromResponse(data),
    });

    return { success: true, data: getSegmentsFromResponse(data) };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch segments");

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.LIST_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

/* =========================
   CREATE SEGMENT
========================= */
export const createEmailSegment = (formData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post(BASE_URL, formData);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.CREATE_SUCCESS,
      payload: {
        segment: data?.data || data?.segment,
        message: data?.message || "Segment created successfully",
      },
    });

    await dispatch(fetchEmailSegments());

    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create segment");

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.CREATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

/* =========================
   UPDATE SEGMENT
========================= */
export const updateEmailSegment = (id, formData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(`${BASE_URL}/${id}`, formData);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.UPDATE_SUCCESS,
      payload: {
        segment: data?.data || data?.segment,
        message: data?.message || "Segment updated successfully",
      },
    });

    await dispatch(fetchEmailSegments());

    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update segment");

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

/* =========================
   DELETE SEGMENT
========================= */
export const deleteEmailSegment = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.DELETE_REQUEST });

    const { data } = await axiosInstance.delete(`${BASE_URL}/${id}`);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });

    await dispatch(fetchEmailSegments());

    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete segment");

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.DELETE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

/* =========================
   UI HELPERS
========================= */
export const setSelectedEmailSegment = (segment) => ({
  type: EMAIL_SEGMENT_ACTIONS.SET_SELECTED,
  payload: segment,
});

export const clearEmailSegmentError = () => ({
  type: EMAIL_SEGMENT_ACTIONS.CLEAR_ERROR,
});

export const resetEmailSegmentSuccess = () => ({
  type: EMAIL_SEGMENT_ACTIONS.RESET_SUCCESS,
});