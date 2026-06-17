import axiosInstance from "../../../utils/axiosInstance";

import {
  REVIEW_CREATE_REQUEST,
  REVIEW_CREATE_SUCCESS,
  REVIEW_CREATE_FAIL,
  REVIEW_LIST_REQUEST,
  REVIEW_LIST_SUCCESS,
  REVIEW_LIST_FAIL,
  REVIEW_RESET,
} from "./reviewActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const cleanReviewPayload = ({ rating, title, comment }) => ({
  rating: Number(rating),
  title: String(title || "").trim(),
  comment: String(comment || "").trim(),
});

export const createCourseReview =
  ({ courseId, rating, title, comment }) =>
  async (dispatch) => {
    try {
      dispatch({ type: REVIEW_CREATE_REQUEST });

      const payload = cleanReviewPayload({ rating, title, comment });

      const { data } = await axiosInstance.post("/reviews", {
        reviewType: "course",
        courseId,
        ...payload,
      });

      const review = data?.data || data?.review || null;

      dispatch({
        type: REVIEW_CREATE_SUCCESS,
        payload: {
          message:
            data?.message ||
            "Review submitted successfully. It will appear after admin approval.",
          review,
        },
      });

      return {
        success: true,
        message:
          data?.message ||
          "Review submitted successfully. It will appear after admin approval.",
        data: review,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to submit review. Please try again.",
      );

      dispatch({
        type: REVIEW_CREATE_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    }
  };

export const createProductReview =
  ({ productId, rating, title, comment }) =>
  async (dispatch) => {
    try {
      dispatch({ type: REVIEW_CREATE_REQUEST });

      const payload = cleanReviewPayload({ rating, title, comment });

      const { data } = await axiosInstance.post("/reviews", {
        reviewType: "product",
        productId,
        ...payload,
      });

      const review = data?.data || data?.review || null;

      dispatch({
        type: REVIEW_CREATE_SUCCESS,
        payload: {
          message:
            data?.message ||
            "Product review submitted successfully. It will appear after admin approval.",
          review,
        },
      });

      return {
        success: true,
        message:
          data?.message ||
          "Product review submitted successfully. It will appear after admin approval.",
        data: review,
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Failed to submit product review. Please try again.",
      );

      dispatch({
        type: REVIEW_CREATE_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    }
  };

export const fetchCourseReviews =
  ({ courseId, page = 1, limit = 20 } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: REVIEW_LIST_REQUEST });

      const params = new URLSearchParams();

      if (courseId) params.set("courseId", courseId);
      params.set("page", String(Math.max(1, Number(page) || 1)));
      params.set(
        "limit",
        String(Math.min(50, Math.max(1, Number(limit) || 20))),
      );

      const { data } = await axiosInstance.get(`/reviews?${params.toString()}`);

      dispatch({
        type: REVIEW_LIST_SUCCESS,
        payload: data?.data || {
          reviews: [],
          totalReviews: 0,
          averageRating: 0,
          page: 1,
          pages: 1,
        },
      });

      return {
        success: true,
        data: data?.data,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load course reviews.");

      dispatch({
        type: REVIEW_LIST_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    }
  };

export const fetchProductReviews =
  ({ productId, page = 1, limit = 20 } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: REVIEW_LIST_REQUEST });

      const params = new URLSearchParams();

      if (productId) params.set("productId", productId);
      params.set("page", String(Math.max(1, Number(page) || 1)));
      params.set(
        "limit",
        String(Math.min(50, Math.max(1, Number(limit) || 20))),
      );

      const { data } = await axiosInstance.get(`/reviews?${params.toString()}`);

      dispatch({
        type: REVIEW_LIST_SUCCESS,
        payload: data?.data || {
          reviews: [],
          totalReviews: 0,
          averageRating: 0,
          page: 1,
          pages: 1,
        },
      });

      return {
        success: true,
        data: data?.data,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load product reviews.");

      dispatch({
        type: REVIEW_LIST_FAIL,
        payload: message,
      });

      return {
        success: false,
        message,
      };
    }
  };

export const resetReview = () => ({
  type: REVIEW_RESET,
});
