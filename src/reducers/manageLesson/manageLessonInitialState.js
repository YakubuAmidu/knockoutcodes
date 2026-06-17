// src/reducers/manageLesson/manageLessonInitialState.js

export const manageLessonInitialState = {
  // Loading states
  loading: false,
  creating: false,
  updating: false,
  deleting: false,

  // Data
  lessons: [],

  // Selected lesson (future-safe)
  selectedLesson: null,

  // Statistics (future-safe)
  totalLessons: 0,
  publishedLessons: 0,
  draftLessons: 0,
  previewLessons: 0,

  // UI state
  successMessage: null,
  error: null,

  // Last action tracking
  lastCreatedLessonId: null,
  lastUpdatedLessonId: null,
  lastDeletedLessonId: null,
};
