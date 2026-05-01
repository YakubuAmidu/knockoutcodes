// src/reducers/myMessages/myMessagesInitialState.js
export const myMessagesInitialState = {
  items: [],
  selectedId: null,
  active: null, // full ticket (thread)

  loadingList: false,
  loadingThread: false,
  sending: false,

  draft: "",
  error: "",
  needsLogin: false,

  lastLoadedAt: null,
  lastSentAt: null,
};
