// src/admin/reducers/manageCourses/manageCoursesReducer.js
import { MANAGE_COURSES_ACTIONS as T } from "./manageCoursesActionTypes";
import { manageCoursesInitialState } from "./manageCoursesInitialState";

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.courses)) return value.courses;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const ensureMeta = (value) => ({
  total: Number(value?.total || 0),
  page: Number(value?.page || 1),
  pages: Number(value?.pages || 1),
});

export const manageCoursesReducer = (
  state = manageCoursesInitialState,
  action
) => {
  switch (action.type) {
    case T.FETCH_START:
      return {
        ...state,
        loading: true,
        error: "",
        successMessage: "",
      };

    case T.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        courses: ensureArray(action.payload),
        meta: ensureMeta(action.payload?.meta),
        error: "",
      };

    case T.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        courses: [],
        error: action.payload || "Failed to load courses.",
      };

    case T.SAVE_START:
      return {
        ...state,
        saving: true,
        error: "",
        successMessage: "",
      };

    case T.CREATE_SUCCESS:
      return {
        ...state,
        saving: false,
        courses: [action.payload, ...ensureArray(state.courses)].filter(Boolean),
        selectedCourse: null,
        successMessage: "Course created successfully.",
        error: "",
      };

    case T.UPDATE_SUCCESS:
      return {
        ...state,
        saving: false,
        courses: ensureArray(state.courses).map((course) =>
          course?._id === action.payload?._id ? action.payload : course
        ),
        selectedCourse: action.payload,
        successMessage: "Course updated successfully.",
        error: "",
      };

    case T.SAVE_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Failed to save course.",
      };

    case T.DELETE_START:
      return {
        ...state,
        deleting: true,
        error: "",
        successMessage: "",
      };

    case T.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        courses: ensureArray(state.courses).filter(
          (course) => course?._id !== action.payload
        ),
        selectedCourse:
          state.selectedCourse?._id === action.payload
            ? null
            : state.selectedCourse,
        successMessage: "Course deleted successfully.",
        error: "",
      };

    case T.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload || "Failed to delete course.",
      };

    case T.SET_SELECTED_COURSE:
      return {
        ...state,
        selectedCourse: action.payload || null,
      };

    case T.CLEAR_SELECTED_COURSE:
      return {
        ...state,
        selectedCourse: null,
      };

    case T.SET_SEARCH:
      return {
        ...state,
        search: String(action.payload || ""),
      };

    case T.SET_LEVEL_FILTER:
      return {
        ...state,
        levelFilter: action.payload || "all",
      };

    case T.SET_STATUS_FILTER:
      return {
        ...state,
        statusFilter: action.payload || "all",
      };

    case T.CLEAR_ERROR:
      return {
        ...state,
        error: "",
        successMessage: "",
      };

    case T.CLEAR_SUCCESS:
      return {
        ...state,
        successMessage: "",
      };

    default:
      return state;
  }
};

export default manageCoursesReducer;