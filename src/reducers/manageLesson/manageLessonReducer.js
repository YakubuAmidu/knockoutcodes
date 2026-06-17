// src/reducers/manageLesson/manageLessonReducer.js

import { MANAGE_LESSON_ACTIONS } from "./manageLessonActionTypes";
import { manageLessonInitialState } from "./manageLessonInitialState";

function calculateStats(lessons = []) {
  return {
    totalLessons: lessons.length,

    publishedLessons: lessons.filter((lesson) => lesson?.isPublished !== false)
      .length,

    draftLessons: lessons.filter((lesson) => lesson?.isPublished === false)
      .length,

    previewLessons: lessons.filter((lesson) => lesson?.isPreview === true)
      .length,
  };
}

export const manageLessonReducer = (
  state = manageLessonInitialState,
  action,
) => {
  switch (action.type) {
    /**
     * =========================
     * FETCH LESSONS
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.LESSONS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.LESSONS_SUCCESS: {
      const lessons = Array.isArray(action.payload) ? action.payload : [];

      return {
        ...state,
        loading: false,
        lessons,
        error: null,
        ...calculateStats(lessons),
      };
    }

    case MANAGE_LESSON_ACTIONS.LESSONS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    /**
     * =========================
     * CREATE LESSON
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_SUCCESS: {
      const lesson = action.payload;

      const lessonExists = state.lessons.some(
        (item) => item?._id === lesson?._id,
      );

      const updatedLessons = lessonExists
        ? state.lessons
        : [lesson, ...state.lessons];

      return {
        ...state,
        creating: false,
        lessons: updatedLessons,
        successMessage: "Lesson created successfully.",
        lastCreatedLessonId: lesson?._id || null,
        error: null,
        ...calculateStats(updatedLessons),
      };
    }

    case MANAGE_LESSON_ACTIONS.CREATE_LESSON_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    /**
     * =========================
     * UPDATE LESSON
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_SUCCESS: {
      const updatedLesson = action.payload;

      const updatedLessons = state.lessons.map((lesson) =>
        lesson?._id === updatedLesson?._id ? updatedLesson : lesson,
      );

      return {
        ...state,
        updating: false,
        lessons: updatedLessons,
        selectedLesson: updatedLesson,
        successMessage: "Lesson updated successfully.",
        lastUpdatedLessonId: updatedLesson?._id || null,
        error: null,
        ...calculateStats(updatedLessons),
      };
    }

    case MANAGE_LESSON_ACTIONS.UPDATE_LESSON_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    /**
     * =========================
     * DELETE LESSON
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
      };

    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_SUCCESS: {
      const lessonId = action.payload;

      const updatedLessons = state.lessons.filter(
        (lesson) => lesson?._id !== lessonId,
      );

      return {
        ...state,
        deleting: false,
        lessons: updatedLessons,
        selectedLesson:
          state.selectedLesson?._id === lessonId ? null : state.selectedLesson,
        successMessage: "Lesson deleted successfully.",
        lastDeletedLessonId: lessonId,
        error: null,
        ...calculateStats(updatedLessons),
      };
    }

    case MANAGE_LESSON_ACTIONS.DELETE_LESSON_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    /**
     * =========================
     * CLEAR UI MESSAGES
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.CLEAR_LESSON_MESSAGES:
      return {
        ...state,
        successMessage: null,
        error: null,
      };

    /**
     * =========================
     * RESET MODULE
     * =========================
     */
    case MANAGE_LESSON_ACTIONS.RESET_LESSON_STATE:
      return {
        ...manageLessonInitialState,
      };

    default:
      return state;
  }
};
