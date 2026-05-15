// src/reducers/courseDetail/courseDetailReducer.js

import { COURSE_DETAIL_ACTIONS } from "./courseDetailActionTypes";
import { courseDetailInitialState } from "./courseDetailInitialState";

export const courseDetailReducer = (
  state = courseDetailInitialState,
  action
) => {
  switch (action.type) {
    case COURSE_DETAIL_ACTIONS.COURSE_DETAIL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_DETAIL_SUCCESS:
      return {
        ...state,
        loading: false,
        course: action.payload,
        error: null,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_DETAIL_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_ACCESS_REQUEST:
      return {
        ...state,
        accessLoading: true,
        error: null,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_ACCESS_SUCCESS:
      return {
        ...state,
        accessLoading: false,
        hasAccess: Boolean(action.payload?.hasAccess),
        accessType: action.payload?.accessType || null,
        error: null,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_ACCESS_FAIL:
      return {
        ...state,
        accessLoading: false,
        hasAccess: false,
        error: action.payload,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_REQUEST:
      return {
        ...state,
        checkoutLoading: true,
        error: null,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_SUCCESS:
      return {
        ...state,
        checkoutLoading: false,
        checkoutUrl: action.payload,
        successMessage: "Checkout started successfully.",
      };

    case COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_FAIL:
      return {
        ...state,
        checkoutLoading: false,
        error: action.payload,
      };

    case COURSE_DETAIL_ACTIONS.COURSE_DETAIL_RESET:
      return courseDetailInitialState;

    default:
      return state;
  }
};