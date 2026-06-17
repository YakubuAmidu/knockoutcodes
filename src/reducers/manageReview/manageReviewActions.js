import axiosInstance from "../../../utils/axiosInstance";

import {
  MANAGE_REVIEW_REQUEST,
  MANAGE_REVIEW_SUCCESS,
  MANAGE_REVIEW_FAIL,
  MANAGE_REVIEW_APPROVE_SUCCESS,
  MANAGE_REVIEW_UNAPPROVE_SUCCESS,
  MANAGE_REVIEW_DELETE_SUCCESS,
  MANAGE_REVIEW_RESET,
} from "./manageReviewActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchAdminReviews =
  ({ q = "", status = "all", type = "all", page = 1, limit = 100 } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: MANAGE_REVIEW_REQUEST });

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status && status !== "all") params.set("status", status);
      if (type && type !== "all") params.set("type", type);

      params.set("page", String(Math.max(1, Number(page) || 1)));
      params.set(
        "limit",
        String(Math.min(100, Math.max(1, Number(limit) || 100))),
      );

      const { data } = await axiosInstance.get(
        `/reviews/admin/all?${params.toString()}`,
      );

      dispatch({
        type: MANAGE_REVIEW_SUCCESS,
        payload: {
          reviews: Array.isArray(data?.data) ? data.data : [],
          meta: data?.meta || {},
        },
      });

      return {
        success: true,
        data: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta || {},
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to load reviews. Please try again.",
      );

      dispatch({
        type: MANAGE_REVIEW_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    }
  };

export const approveAdminReview = (reviewId) => async (dispatch) => {
  try {
    if (!reviewId) {
      return {
        success: false,
        message: "Review id is required.",
      };
    }

    const { data } = await axiosInstance.patch(
      `/reviews/admin/${reviewId}/approve`,
    );

    dispatch({
      type: MANAGE_REVIEW_APPROVE_SUCCESS,
      payload: data?.data,
    });

    return {
      success: true,
      data: data?.data,
      message: data?.message || "Review approved successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Could not approve review."),
    };
  }
};

export const unapproveAdminReview = (reviewId) => async (dispatch) => {
  try {
    if (!reviewId) {
      return {
        success: false,
        message: "Review id is required.",
      };
    }

    const { data } = await axiosInstance.patch(
      `/reviews/admin/${reviewId}/unapprove`,
    );

    dispatch({
      type: MANAGE_REVIEW_UNAPPROVE_SUCCESS,
      payload: data?.data,
    });

    return {
      success: true,
      data: data?.data,
      message: data?.message || "Review unapproved successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Could not unapprove review."),
    };
  }
};

export const deleteAdminReview = (reviewId) => async (dispatch) => {
  try {
    if (!reviewId) {
      return {
        success: false,
        message: "Review id is required.",
      };
    }

    const { data } = await axiosInstance.delete(`/reviews/${reviewId}`);

    dispatch({
      type: MANAGE_REVIEW_DELETE_SUCCESS,
      payload: reviewId,
    });

    return {
      success: true,
      message: data?.message || "Review deleted successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Could not delete review."),
    };
  }
};

export const resetManageReview = () => ({
  type: MANAGE_REVIEW_RESET,
});
