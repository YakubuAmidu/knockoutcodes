export const emailTemplateInitialState = {
  loading: false,
  detailsLoading: false,
  creating: false,
  updating: false,
  deleting: false,

  templates: [],
  selectedTemplate: null,

  summary: {
    totalAll: 0,
    draft: 0,
    active: 0,
    inactive: 0,
    archived: 0,
    usageCount: 0,
  },

  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  },

  search: "",
  category: "all",
  status: "all",
  sort: "newest",

  success: false,
  successMessage: null,
  error: null,
};
