// src/reducers/manageNewsletter/manageNewsletterInitialState.js

export const manageNewsletterInitialState = {
  loadingList: false,
  saving: false,
  deleting: false,

  newsletters: [],
  selectedId: null,
  search: "",

  error: "",
  systemMessage: null, // { tone: "error" | "success" | "info", text: string }
};