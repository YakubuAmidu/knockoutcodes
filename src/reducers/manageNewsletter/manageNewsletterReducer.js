// src/reducers/manageNewsletter/manageNewsletterReducer.js

import { MANAGE_NEWSLETTER_ACTIONS } from "./manageNewsletterActionTypes";
import { manageNewsletterInitialState } from "./manageNewsletterInitialState";

export default function manageNewsletterReducer(
  state = manageNewsletterInitialState,
  action
) {
  const { type, payload } = action;

  const getId = (n) =>
    (n && (n._id || n.id || n.newsletterId || n.newsletterID)) || "";

  switch (type) {
    // ---- LIST ----
    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_REQUEST:
      return {
        ...state,
        loadingList: true,
        error: "",
      };

    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_SUCCESS:
      return {
        ...state,
        loadingList: false,
        error: "",
        newsletters: Array.isArray(payload?.list) ? payload.list : [],
        selectedId:
          payload?.selectedId !== undefined && payload?.selectedId !== null
            ? payload.selectedId
            : state.selectedId,
      };

    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_LIST_FAIL:
      return {
        ...state,
        loadingList: false,
        error: payload?.error || "Unable to load newsletters.",
        systemMessage: payload?.systemMessage || state.systemMessage,
      };

    // ---- UPDATE ----
    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_REQUEST:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_SUCCESS: {
      const updated = payload?.updated;
      const updatedId = getId(updated);

      const exists = state.newsletters.some((n) => getId(n) === updatedId);

      const nextList = exists
        ? state.newsletters.map((n) => {
            const id = getId(n);
            return id === updatedId ? updated : n;
          })
        : updatedId
        ? [updated, ...state.newsletters]
        : state.newsletters;

      return {
        ...state,
        saving: false,
        error: "",
        newsletters: nextList,
        selectedId: updatedId || state.selectedId,
        systemMessage: payload?.systemMessage || state.systemMessage,
      };
    }

    case MANAGE_NEWSLETTER_ACTIONS.ADMIN_UPDATE_FAIL:
      return {
        ...state,
        saving: false,
        error: payload?.error || "Update failed.",
        systemMessage: payload?.systemMessage || state.systemMessage,
      };

    // ---- UI ----
    case MANAGE_NEWSLETTER_ACTIONS.SET_SELECTED_ID:
      return {
        ...state,
        selectedId: payload || null,
      };

    case MANAGE_NEWSLETTER_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: payload || "",
      };

    case MANAGE_NEWSLETTER_ACTIONS.SET_SYSTEM_MESSAGE:
      return {
        ...state,
        systemMessage: payload || null,
      };

    case MANAGE_NEWSLETTER_ACTIONS.CLEAR_SYSTEM_MESSAGE:
      return {
        ...state,
        systemMessage: null,
      };
    
    // ---- DELETE ----
case MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_REQUEST:
  return {
    ...state,
    deleting: true,
    error: "",
  };

case MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_SUCCESS:
  return {
    ...state,
    deleting: false,
    error: "",
    newsletters: state.newsletters.filter(
      (n) => getId(n) !== payload?.deletedId
    ),
    selectedId:
      state.selectedId === payload?.deletedId
        ? null
        : state.selectedId,
    systemMessage: {
      tone: "success",
      text: "Subscriber deleted successfully.",
    },
  };

case MANAGE_NEWSLETTER_ACTIONS.ADMIN_DELETE_FAIL:
  return {
    ...state,
    deleting: false,
    error: payload?.error || "Delete failed.",
    systemMessage: {
      tone: "error",
      text: payload?.error || "Delete failed.",
    },
  };

    default:
      return state;
  }
}