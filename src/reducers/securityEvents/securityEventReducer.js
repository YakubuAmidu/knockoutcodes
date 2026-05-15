// src/reducers/securityEvents/securityEventReducer.js

import { SECURITY_EVENT_ACTIONS } from "./securityEventActionTypes";
import { securityEventInitialState } from "./securityEventInitialState";

function updateItem(items, updatedItem) {
  if (!updatedItem?._id) return items;

  return items.map((item) =>
    item._id === updatedItem._id ? { ...item, ...updatedItem } : item
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
        items: action.payload?.items || [],
        page: action.payload?.page || 1,
        limit: action.payload?.limit || 20,
        total: action.payload?.total || 0,
        pages: action.payload?.pages || 0,
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
      };

    case SECURITY_EVENT_ACTIONS.UPDATE_SECURITY_EVENT_REVIEW_SUCCESS:
    case SECURITY_EVENT_ACTIONS.DEACTIVATE_SECURITY_EVENT_USER_SUCCESS:
    case SECURITY_EVENT_ACTIONS.BLOCK_SECURITY_EVENT_IP_SUCCESS:
      case SECURITY_EVENT_ACTIONS.UNBLOCK_SECURITY_EVENT_IP_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        items: updateItem(state.items, action.payload?.item),
        actionMessage: action.payload?.message || "Security event updated.",
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

    case SECURITY_EVENT_ACTIONS.RESET_SECURITY_EVENTS:
      return securityEventInitialState;

    default:
      return state;
  }
}