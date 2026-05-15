// src/reducers/manageLesson/manageLessonReducer.js

import { MANAGE_LESSON_ACTIONS } from "./manageLessonActionTypes";

export const manageLessonReducer = (state, action) => {
  switch (action.type) {
    // ======================
    // FETCH
    // ======================
    case MANAGE_LESSON_ACTIONS.LESSONS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.LESSONS_SUCCESS:
      return {
        ...state,
        loading: false,
        lessons: action.payload,
      };

    case MANAGE_LESSON_ACTIONS.LESSONS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ======================
    // CREATE
    // ======================
    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_SUCCESS:
      return {
        ...state,
        creating: false,
        lessons: [action.payload, ...state.lessons],
        successMessage: "Lesson created successfully.",
      };

    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    // ======================
    // UPDATE
    // ======================
    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_SUCCESS:
      return {
        ...state,
        updating: false,
        lessons: state.lessons.map((lesson) =>
          lesson._id === action.payload._id
            ? action.payload
            : lesson
        ),
        successMessage: "Lesson updated successfully.",
      };

    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    // ======================
    // DELETE
    // ======================
    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_SUCCESS:
      return {
        ...state,
        deleting: false,
        lessons: state.lessons.filter(
          (lesson) => lesson._id !== action.payload
        ),
        successMessage: "Lesson deleted successfully.",
      };

    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    // ======================
    // CLEAR
    // ======================
    case MANAGE_LESSON_ACTIONS.CLEAR_LESSON_MESSAGES:
      return {
        ...state,
        successMessage: null,
        error: null,
      };

    default:
      return state;
  }
};