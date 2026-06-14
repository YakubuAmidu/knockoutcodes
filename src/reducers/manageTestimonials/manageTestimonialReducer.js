import {
  MANAGE_TESTIMONIAL_REQUEST,
  MANAGE_TESTIMONIAL_SUCCESS,
  MANAGE_TESTIMONIAL_FAIL,
  MANAGE_TESTIMONIAL_ACTION_REQUEST,
  MANAGE_TESTIMONIAL_ACTION_FINISH,
  UPDATE_TESTIMONIAL_SUCCESS,
  DELETE_TESTIMONIAL_SUCCESS,
  CLEAR_MANAGE_TESTIMONIAL_ERROR,
} from "./manageTestimonialActionTypes";

export function manageTestimonialReducer(state, action) {
  switch (action.type) {
    case MANAGE_TESTIMONIAL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MANAGE_TESTIMONIAL_SUCCESS:
      return {
        ...state,
        loading: false,
        testimonials: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    case MANAGE_TESTIMONIAL_ACTION_REQUEST:
      return {
        ...state,
        actionLoading: true,
        error: null,
      };

    case MANAGE_TESTIMONIAL_ACTION_FINISH:
      return {
        ...state,
        actionLoading: false,
      };

    case UPDATE_TESTIMONIAL_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        testimonials: state.testimonials.map((item) =>
          item._id === action.payload?._id ? action.payload : item
        ),
        error: null,
      };

    case DELETE_TESTIMONIAL_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        testimonials: state.testimonials.filter(
          (item) => item._id !== action.payload
        ),
        error: null,
      };

    case MANAGE_TESTIMONIAL_FAIL:
      return {
        ...state,
        loading: false,
        actionLoading: false,
        error: action.payload,
      };

    case CLEAR_MANAGE_TESTIMONIAL_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}