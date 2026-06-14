// src/reducers/securityEvents/securityEventReducer.js
import { SECURITY_EVENT_ACTIONS } from "./securityEventActionTypes";
import { securityEventInitialState } from "./securityEventInitialState";

function getUpdatedEvent(payload) {
  return payload?.item || payload?.event || payload?.data || null;
}

function updateItem(items, updatedItem, fallbackId = "") {
  if (!updatedItem?._id && !fallbackId) return items;

  return items.map((item) => {
    const isMatch = updatedItem?._id
      ? item._id === updatedItem._id
      : item._id === fallbackId;

    if (!isMatch) return item;

    return {
      ...item,
      ...(updatedItem || {}),
    };
  });
}

function markEventAction(items, eventId, patch = {}) {
  if (!eventId) return items;

  return items.map((item) =>
    item._id === eventId
      ? {
          ...item,
          ...patch,
        }
      : item
  );
}

export function securityEventReducer(
  state = securityEventInitialState,
  action
) {
  switch (action.type) {
    case SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        items: action.payload?.items || action.payload?.data || [],
        page: Number(action.payload?.page) || 1,
        limit: Number(action.payload?.limit) || 20,
        total: Number(action.payload?.total) || 0,
        pages: Number(action.payload?.pages) || 0,
      };

    case SECURITY_EVENT_ACTIONS.FETCH_SECURITY_EVENTS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to fetch security events.",
      };

    case SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_START:
    case SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_START:
    case SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_START:
    case SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_START:
    case SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_START:
      return {
        ...state,
        actionLoading: true,
        error: null,
        actionMessage: "",
      };

    case SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_SUCCESS: {
      const updatedEvent = getUpdatedEvent(action.payload);

      return {
        ...state,
        actionLoading: false,
        items: updateItem(state.items, updatedEvent),
        actionMessage: action.payload?.message || "Security event reviewed.",
      };
    }

    case SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        items: markEventAction(state.items, action.payload?.eventId, {
          reviewStatus: "resolved",
          actionTaken: "user_deactivated",
          adminNote:
            action.payload?.adminNote ||
            "User deactivated from admin security review.",
        }),
        actionMessage:
          action.payload?.message || "User account deactivated.",
      };

    case SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        items: markEventAction(state.items, action.payload?.eventId, {
          reviewStatus: "resolved",
          actionTaken: "ip_blocked",
        }),
        actionMessage: action.payload?.message || "IP address blocked.",
      };

    case SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        items: markEventAction(state.items, action.payload?.eventId, {
          reviewStatus: "resolved",
          actionTaken: "ip_unblocked",
        }),
        actionMessage: action.payload?.message || "IP address unblocked.",
      };

    case SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        items: state.items.filter(
          (item) => item._id !== action.payload?.deletedId
        ),
        total: Math.max((state.total || 0) - 1, 0),
        actionMessage: action.payload?.message || "Security event deleted.",
      };

    case SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_FAIL:
    case SECURITY_EVENT_ACTIONS.DELETE_SECURITY_EVENT_FAIL:
    case SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_FAIL:
    case SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_FAIL:
    case SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_FAIL:
      return {
        ...state,
        actionLoading: false,
        error: action.payload || "Security event action failed.",
      };

    case SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_START:
      return {
        ...state,
        cleanupLoading: true,
        error: null,
        cleanupMessage: "",
      };

    case SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_SUCCESS:
      return {
        ...state,
        cleanupLoading: false,
        cleanupMessage:
          action.payload?.message || "Old security events cleaned successfully.",
      };

    case SECURITY_EVENT_ACTIONS.CLEANUP_SECURITY_EVENTS_FAIL:
      return {
        ...state,
        cleanupLoading: false,
        error: action.payload || "Failed to cleanup security events.",
      };

    case SECURITY_EVENT_ACTIONS.SET_SECURITY_EVENT_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...(action.payload || {}),
        },
        page: 1,
      };

    case SECURITY_EVENT_ACTIONS.CLEAR_SECURITY_EVENT_ERROR:
      return {
        ...state,
        error: null,
      };

    case SECURITY_EVENT_ACTIONS.CLEAR_SECURITY_EVENT_MESSAGES:
      return {
        ...state,
        error: null,
        cleanupMessage: "",
        actionMessage: "",
      };

    case SECURITY_EVENT_ACTIONS.RESET_SECURITY_EVENTS:
      return securityEventInitialState;

    default:
      return state;
  }
}