import {
  MANAGE_REVIEW_REQUEST,
  MANAGE_REVIEW_SUCCESS,
  MANAGE_REVIEW_FAIL,
  MANAGE_REVIEW_APPROVE_SUCCESS,
  MANAGE_REVIEW_UNAPPROVE_SUCCESS,
  MANAGE_REVIEW_DELETE_SUCCESS,
  MANAGE_REVIEW_RESET,
} from "./manageReviewActionTypes";

import { manageReviewInitialState } from "./manageReviewInitialState";

function recalcStats(reviews = []) {
  const total = reviews.length;
  const approved = reviews.filter((review) => review.isApproved).length;
  const pending = total - approved;

  const averageRating =
    total > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        total
      : 0;

  return {
    total,
    approved,
    pending,
    averageRating: Number(averageRating.toFixed(1)),
  };
}

function updateReviewInList(reviews, updatedReview) {
  if (!updatedReview?._id) return reviews;

  return reviews.map((review) =>
    review._id === updatedReview._id ? updatedReview : review,
  );
}

export function manageReviewReducer(state = manageReviewInitialState, action) {
  switch (action.type) {
    case MANAGE_REVIEW_REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case MANAGE_REVIEW_SUCCESS: {
      const reviews = Array.isArray(action.payload?.reviews)
        ? action.payload.reviews
        : [];

      return {
        ...state,
        loading: false,
        error: "",
        reviews,
        meta: {
          ...state.meta,
          ...action.payload?.meta,
          stats: {
            ...state.meta.stats,
            ...(action.payload?.meta?.stats || recalcStats(reviews)),
          },
        },
      };
    }

    case MANAGE_REVIEW_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Something went wrong.",
      };

    case MANAGE_REVIEW_APPROVE_SUCCESS:
    case MANAGE_REVIEW_UNAPPROVE_SUCCESS: {
      const reviews = updateReviewInList(state.reviews, action.payload);

      return {
        ...state,
        reviews,
        meta: {
          ...state.meta,
          stats: recalcStats(reviews),
        },
      };
    }

    case MANAGE_REVIEW_DELETE_SUCCESS: {
      const reviews = state.reviews.filter(
        (review) => review._id !== action.payload,
      );

      return {
        ...state,
        reviews,
        meta: {
          ...state.meta,
          total: Math.max(Number(state.meta.total || 0) - 1, 0),
          stats: recalcStats(reviews),
        },
      };
    }

    case MANAGE_REVIEW_RESET:
      return manageReviewInitialState;

    default:
      return state;
  }
}
