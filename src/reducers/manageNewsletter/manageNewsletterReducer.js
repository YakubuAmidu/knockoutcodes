import { MANAGE_NEWSLETTER_ACTIONS as T } from "./manageNewsletterActionTypes";
import { manageNewsletterInitialState } from "./manageNewsletterInitialState";

const getId = (n) =>
  (n && (n._id || n.id || n.newsletterId || n.newsletterID)) || "";

const safeArray = (value) => (Array.isArray(value) ? value : []);

export default function manageNewsletterReducer(
  state = manageNewsletterInitialState,
  action = {}
) {
  const { type, payload = {} } = action;

  switch (type) {
    case T.ADMIN_LIST_REQUEST:
      return {
        ...state,
        loadingList: true,
        error: "",
      };

    case T.ADMIN_LIST_SUCCESS:
      return {
        ...state,
        loadingList: false,
        error: "",
        newsletters: safeArray(payload.list),
        selectedId:
          payload.selectedId !== undefined && payload.selectedId !== null
            ? payload.selectedId
            : state.selectedId,
        total: Number(payload.total) || safeArray(payload.list).length,
        active: Number(payload.active) || 0,
        inactive: Number(payload.inactive) || 0,
        page: Number(payload.page) || 1,
        pages: Number(payload.pages) || 1,
      };

    case T.ADMIN_LIST_FAIL:
      return {
        ...state,
        loadingList: false,
        error: payload.error || "Unable to load newsletters.",
        systemMessage: payload.systemMessage || state.systemMessage,
      };

    case T.ADMIN_UPDATE_REQUEST:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case T.ADMIN_UPDATE_SUCCESS: {
      const updated = payload.updated;
      const updatedId = getId(updated);

      const exists = state.newsletters.some((n) => getId(n) === updatedId);

      const nextList =
        exists && updatedId
          ? state.newsletters.map((n) => (getId(n) === updatedId ? updated : n))
          : updatedId
          ? [updated, ...state.newsletters]
          : state.newsletters;

      return {
        ...state,
        saving: false,
        error: "",
        newsletters: nextList,
        selectedId: updatedId || state.selectedId,
        systemMessage:
          payload.systemMessage || {
            tone: "success",
            text: "Subscriber updated successfully.",
          },
      };
    }

    case T.ADMIN_UPDATE_FAIL:
      return {
        ...state,
        saving: false,
        error: payload.error || "Update failed.",
        systemMessage: payload.systemMessage || {
          tone: "error",
          text: payload.error || "Update failed.",
        },
      };

    case T.ADMIN_DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: "",
      };

    case T.ADMIN_DELETE_SUCCESS: {
      const deletedId = payload.deletedId;

      return {
        ...state,
        deleting: false,
        error: "",
        newsletters: state.newsletters.filter((n) => getId(n) !== deletedId),
        selectedId: state.selectedId === deletedId ? null : state.selectedId,
        systemMessage: {
          tone: "success",
          text: "Subscriber deleted successfully.",
        },
      };
    }

    case T.ADMIN_DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: payload.error || "Delete failed.",
        systemMessage: {
          tone: "error",
          text: payload.error || "Delete failed.",
        },
      };

    case T.SET_SELECTED_ID:
      return {
        ...state,
        selectedId: payload || null,
      };

    case T.SET_SEARCH:
      return {
        ...state,
        search: payload || "",
      };

    case T.SET_SYSTEM_MESSAGE:
      return {
        ...state,
        systemMessage: payload || null,
      };

    case T.CLEAR_SYSTEM_MESSAGE:
      return {
        ...state,
        systemMessage: null,
      };

    default:
      return state;
  }
}