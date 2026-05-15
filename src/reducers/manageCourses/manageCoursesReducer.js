// src/admin/reducers/manageCourses/manageCoursesReducer.js

import { MANAGE_COURSES_ACTIONS } from "./manageCoursesActionTypes";
import { manageCoursesInitialState } from "./manageCoursesInitialState";

export const manageCoursesReducer = (
  state = manageCoursesInitialState,
  action
) => {
  switch (action.type) {
    case MANAGE_COURSES_ACTIONS.FETCH_START:
      return {
        ...state,
        loading: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_COURSES_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        courses: action.payload.courses,
        meta: action.payload.meta,
        error: "",
      };

    case MANAGE_COURSES_ACTIONS.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.SAVE_START:
      return {
        ...state,
        saving: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_COURSES_ACTIONS.CREATE_SUCCESS:
      return {
        ...state,
        saving: false,
        courses: [action.payload.course, ...state.courses],
        meta: {
          ...state.meta,
          total: Number(state.meta.total || 0) + 1,
        },
        successMessage: action.payload.message,
      };

    case MANAGE_COURSES_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        saving: false,
        courses: state.courses.map((course) =>
          String(course._id) === String(action.payload.course._id)
            ? action.payload.course
            : course
        ),
        selectedCourse: null,
        successMessage: action.payload.message,
      };

    case MANAGE_COURSES_ACTIONS.SAVE_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.DELETE_START:
      return {
        ...state,
        deleting: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_COURSES_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        courses: state.courses.filter(
          (course) => String(course._id) !== String(action.payload.id)
        ),
        meta: {
          ...state.meta,
          total: Math.max(0, Number(state.meta.total || 0) - 1),
        },
        successMessage: action.payload.message,
      };

    case MANAGE_COURSES_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.SET_SELECTED_COURSE:
      return {
        ...state,
        selectedCourse: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.CLEAR_SELECTED_COURSE:
      return {
        ...state,
        selectedCourse: null,
      };

    case MANAGE_COURSES_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.SET_LEVEL_FILTER:
      return {
        ...state,
        levelFilter: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.SET_STATUS_FILTER:
      return {
        ...state,
        statusFilter: action.payload,
      };

    case MANAGE_COURSES_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: "",
      };

    case MANAGE_COURSES_ACTIONS.RESET:
      return manageCoursesInitialState;

    default:
      return state;
  }
};