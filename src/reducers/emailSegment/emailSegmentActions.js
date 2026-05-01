import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_SEGMENT_ACTIONS } from "./emailSegmentActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const BASE_URL = "/admin/email-segments";

/* =========================
   GET ALL SEGMENTS
========================= */
export const fetchEmailSegments = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.LIST_REQUEST });

    const { data } = await axiosInstance.get(BASE_URL);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.LIST_SUCCESS,
      payload: data?.data || [],
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.LIST_FAIL,
      payload: getErrorMessage(error, "Failed to fetch segments"),
    });
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
        segment: data?.data,
        message: data?.message || "Segment created successfully",
      },
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.CREATE_FAIL,
      payload: getErrorMessage(error, "Failed to create segment"),
    });
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
        segment: data?.data,
        message: data?.message || "Segment updated successfully",
      },
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.UPDATE_FAIL,
      payload: getErrorMessage(error, "Failed to update segment"),
    });
  }
};

/* =========================
   DELETE SEGMENT
========================= */
export const deleteEmailSegment = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_SEGMENT_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(`${BASE_URL}/${id}`);

    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });
  } catch (error) {
    dispatch({
      type: EMAIL_SEGMENT_ACTIONS.DELETE_FAIL,
      payload: getErrorMessage(error, "Failed to delete segment"),
    });
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