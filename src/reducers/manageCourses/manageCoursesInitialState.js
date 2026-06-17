// src/admin/reducers/manageCourses/manageCoursesInitialState.js

export const manageCoursesInitialState = {
  courses: [],

  meta: {
    total: 0,
    page: 1,
    pages: 1,
  },

  selectedCourse: null,

  loading: false,
  saving: false,
  deleting: false,

  error: "",
  successMessage: "",

  search: "",
  levelFilter: "all",
  statusFilter: "all",
};
