import {
  REVIEW_CREATE_REQUEST,
  REVIEW_CREATE_SUCCESS,
  REVIEW_CREATE_FAIL,
  REVIEW_LIST_REQUEST,
  REVIEW_LIST_SUCCESS,
  REVIEW_LIST_FAIL,
  REVIEW_RESET,
} from "./reviewActionTypes";

import { reviewInitialState } from "./reviewInitialState";

export function reviewReducer(state = reviewInitialState, action) {
  switch (action.type) {
    case REVIEW_CREATE_REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
        success: false,
        message: "",
      };

    case REVIEW_LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case REVIEW_CREATE_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        error: "",
        message:
          action.payload?.message ||
          "Review submitted successfully. It will appear after approval.",
        review: action.payload?.review || null,
      };

    case REVIEW_LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        reviews: Array.isArray(action.payload?.reviews)
          ? action.payload.reviews
          : [],
        totalReviews: Number(action.payload?.totalReviews || 0),
        averageRating: Number(action.payload?.averageRating || 0),
        page: Number(action.payload?.page || 1),
        pages: Number(action.payload?.pages || 1),
      };

    case REVIEW_CREATE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to submit review.",
        success: false,
        message: "",
      };

    case REVIEW_LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load reviews.",
      };

    case REVIEW_RESET:
      return reviewInitialState;

    default:
      return state;
  }
}
