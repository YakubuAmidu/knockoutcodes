import { EMAIL_SUBSCRIBER_ACTIONS } from "./emailSubscriberActionTypes";
import { emailSubscriberInitialState } from "./emailSubscriberInitialState";

export function emailSubscriberReducer(
  state = emailSubscriberInitialState,
  action
) {
  switch (action.type) {
    case EMAIL_SUBSCRIBER_ACTIONS.LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        subscribers: action.payload || [],
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        success: true,
        successMessage: action.payload?.message || "Subscriber updated",
        subscribers: state.subscribers.map((subscriber) =>
          subscriber._id === action.payload?.subscriber?._id
            ? action.payload.subscriber
            : subscriber
        ),
        selectedSubscriber: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        success: true,
        successMessage: "Subscriber deleted",
        subscribers: state.subscribers.filter(
          (subscriber) => subscriber._id !== action.payload
        ),
      };

    case EMAIL_SUBSCRIBER_ACTIONS.LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.SET_SELECTED_SUBSCRIBER:
      return {
        ...state,
        selectedSubscriber: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CLEAR_SELECTED_SUBSCRIBER:
      return {
        ...state,
        selectedSubscriber: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.SET_FILTER:
      return {
        ...state,
        filter: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.RESET_SUCCESS:
      return {
        ...state,
        success: false,
        successMessage: "",
      };

    default:
      return state;
  }
}