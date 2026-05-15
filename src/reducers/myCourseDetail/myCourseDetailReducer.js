// src/reducers/myCourseDetail/myCourseDetailReducer.js

import { MY_COURSE_DETAIL_ACTIONS } from "./myCourseDetailActionTypes";

export const myCourseDetailReducer = (state, action) => {
  switch (action.type) {
    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_SUCCESS:
      return {
        ...state,
        loading: false,
        enrollment: action.payload.enrollment,
        course: action.payload.course,
        error: null,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_REQUEST:
      return {
        ...state,
        lessonsLoading: true,
        lessonsError: null,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_SUCCESS:
      return {
        ...state,
        lessonsLoading: false,
        lessons: action.payload,
        lessonsError: null,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_FAIL:
      return {
        ...state,
        lessonsLoading: false,
        lessonsError: action.payload,
      };

    case MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_RESET:
      return {
        ...state,
        loading: false,
        lessonsLoading: false,
        enrollment: null,
        course: null,
        lessons: [],
        error: null,
        lessonsError: null,
      };

    default:
      return state;
  }
};