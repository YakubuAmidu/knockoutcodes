// reducer/courses/courseReducer.js
import * as T from "./courseActionTypes";

export const courseReducer = (state, action) => {
  switch (action.type) {
    case T.COURSE_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case T.COURSES_SUCCESS:
      return {
        ...state,
        loading: false,
        courses: action.payload,
      };

    case T.COURSE_DETAIL_SUCCESS:
      return {
        ...state,
        loading: false,
        courseDetail: action.payload,
      };

    case T.COURSE_CHECKOUT_REQUEST:
  return {
    ...state,
    checkoutLoading: true,
    checkoutError: null,
    checkoutUrl: null,
    alreadyPurchased: false,
    purchasedCourseId: null,
    purchasedEnrollmentId: null,
    purchaseMessage: "",
  };

    case T.COURSE_CHECKOUT_SUCCESS:
      return {
        ...state,
        checkoutLoading: false,
        checkoutUrl: action.payload,
      };

    case T.COURSE_CHECKOUT_FAIL:
      return {
        ...state,
        checkoutLoading: false,
        checkoutError: action.payload,
      };
    
    case T.COURSE_ALREADY_PURCHASED:
  return {
    ...state,
    checkoutLoading: false,
    checkoutError: null,
    checkoutUrl: null,
    alreadyPurchased: true,
    purchasedCourseId: action.payload?.courseId || null,
    purchasedEnrollmentId: action.payload?.enrollmentId || null,
    purchaseMessage:
      action.payload?.message || "You already purchased this course.",
  };

    case T.COURSE_FAIL:
      return {
        ...state,
        loading: false,
        checkoutLoading: false,
        error: action.payload,
      };

    case T.COURSE_RESET:
  return {
    ...state,
    checkoutLoading: false,
    checkoutError: null,
    checkoutUrl: null,
    enrollSuccess: false,
    alreadyPurchased: false,
    purchasedCourseId: null,
    purchasedEnrollmentId: null,
    purchaseMessage: "",
  };

    default:
      return state;
  }
};
