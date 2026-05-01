// src/reducers/myMessages/myMessagesReducer.js
import { MY_MESSAGES_ACTIONS as T } from "./myMessagesActionTypes";
import { myMessagesInitialState } from "./myMessagesInitialState";

const safeArr = (v) => (Array.isArray(v) ? v : []);

export function myMessagesReducer(state = myMessagesInitialState, action) {
  switch (action.type) {
    case T.LIST_START:
      return {
        ...state,
        loadingList: true,
        error: "",
        needsLogin: false,
      };

    case T.LIST_SUCCESS:
      return {
        ...state,
        loadingList: false,
        items: safeArr(action.payload?.items),
        error: "",
        needsLogin: false,
        lastLoadedAt: Date.now(),
      };

    case T.LIST_ERROR:
      return {
        ...state,
        loadingList: false,
        error: action.payload?.error || "Failed to load messages.",
        needsLogin: !!action.payload?.needsLogin,
      };

    case T.OPEN_START:
      return {
        ...state,
        loadingThread: true,
        error: "",
        needsLogin: false,
      };

    case T.OPEN_SUCCESS:
      return {
        ...state,
        loadingThread: false,
        active: action.payload?.ticket || null,
        selectedId: action.payload?.id || state.selectedId,
        error: "",
        needsLogin: false,
      };

    case T.OPEN_ERROR:
      return {
        ...state,
        loadingThread: false,
        error: action.payload?.error || "Failed to open thread.",
        needsLogin: !!action.payload?.needsLogin,
      };

    case T.SET_SELECTED_ID:
      return { ...state, selectedId: action.payload || null };

    case T.UPDATE_DRAFT:
      return { ...state, draft: String(action.payload ?? "") };

    case T.REPLY_START:
      return { ...state, sending: true, error: "", needsLogin: false };

    case T.REPLY_SUCCESS: {
      const updated = action.payload?.ticket || null;

      // Keep list in sync (last updated ticket first)
      const nextItems = updated?._id
        ? [
            updated,
            ...safeArr(state.items).filter(
              (x) => String(x?._id) !== String(updated._id)
            ),
          ]
        : safeArr(state.items);

      return {
        ...state,
        sending: false,
        active: updated || state.active,
        items: nextItems,
        draft: "",
        error: "",
        needsLogin: false,
        lastSentAt: Date.now(),
      };
    }

    case T.REPLY_ERROR:
      return {
        ...state,
        sending: false,
        error: action.payload?.error || "Failed to send reply.",
        needsLogin: !!action.payload?.needsLogin,
      };

    case T.CLEAR_ERROR:
      return { ...state, error: "" };

    case T.RESET:
      return { ...myMessagesInitialState };

    default:
      return state;
  }
}
