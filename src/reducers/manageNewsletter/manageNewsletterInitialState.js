export const manageNewsletterInitialState = {
  loadingList: false,
  saving: false,
  deleting: false,

  newsletters: [],
  selectedId: null,
  search: "",

  error: "",
  systemMessage: null,

  total: 0,
  active: 0,
  inactive: 0,
  page: 1,
  pages: 1,
};