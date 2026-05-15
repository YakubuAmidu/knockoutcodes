// src/reducers/testimonial/testimonialReducer.js

import { testimonialInitialState } from "./testimonialInitialState";
import {
  TESTIMONIAL_FETCH_START,
  TESTIMONIAL_FETCH_SUCCESS,
  TESTIMONIAL_FETCH_FAIL,
  TESTIMONIAL_CLEAR_ERROR,
} from "./testimonialActionTypes";

export const testimonialReducer = (
  state = testimonialInitialState,
  action
) => {
  switch (action.type) {
    case TESTIMONIAL_FETCH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case TESTIMONIAL_FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        testimonials: action.payload,
        error: null,
      };

    case TESTIMONIAL_FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case TESTIMONIAL_CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};