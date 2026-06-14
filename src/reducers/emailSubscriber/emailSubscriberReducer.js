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

    case EMAIL_SUBSCRIBER_ACTIONS.LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        subscribers: action.payload?.subscribers || [],
        summary: {
          ...state.summary,
          ...(action.payload?.summary || {}),
        },
        pagination: {
          ...state.pagination,
          ...(action.payload?.pagination || {}),
        },
        error: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DETAILS_REQUEST:
      return {
        ...state,
        detailsLoading: true,
        error: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DETAILS_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        selectedSubscriber: action.payload,
        error: null,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DETAILS_FAIL:
      return {
        ...state,
        detailsLoading: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CREATE_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CREATE_SUCCESS:
      return {
        ...state,
        creating: false,
        subscribers: [action.payload, ...state.subscribers],
        success: true,
        successMessage: "Subscriber created successfully",
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CREATE_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        subscribers: state.subscribers.map((subscriber) =>
          subscriber._id === action.payload._id ? action.payload : subscriber
        ),
        selectedSubscriber:
          state.selectedSubscriber?._id === action.payload._id
            ? action.payload
            : state.selectedSubscriber,
        success: true,
        successMessage: "Subscriber updated successfully",
      };

    case EMAIL_SUBSCRIBER_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        subscribers: state.subscribers.filter(
          (subscriber) => subscriber._id !== action.payload
        ),
        selectedSubscriber:
          state.selectedSubscriber?._id === action.payload
            ? null
            : state.selectedSubscriber,
        success: true,
        successMessage: "Subscriber deleted successfully",
      };

    case EMAIL_SUBSCRIBER_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_REQUEST:
    case EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_REQUEST:
      return {
        ...state,
        bulkLoading: true,
        error: null,
        success: false,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_SUCCESS:
      return {
        ...state,
        bulkLoading: false,
        subscribers: state.subscribers.map((subscriber) => {
          const updated = action.payload.subscribers.find(
            (item) => item._id === subscriber._id
          );

          return updated || subscriber;
        }),
        success: true,
        successMessage:
          action.payload.message || "Subscribers updated successfully",
      };

    case EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_SUCCESS:
      return {
        ...state,
        bulkLoading: false,
        subscribers: state.subscribers.filter(
          (subscriber) => !action.payload.ids.includes(subscriber._id)
        ),
        selectedSubscriber:
          state.selectedSubscriber &&
          action.payload.ids.includes(state.selectedSubscriber._id)
            ? null
            : state.selectedSubscriber,
        success: true,
        successMessage:
          action.payload.message || "Subscribers deleted successfully",
      };

    case EMAIL_SUBSCRIBER_ACTIONS.BULK_STATUS_FAIL:
    case EMAIL_SUBSCRIBER_ACTIONS.BULK_DELETE_FAIL:
      return {
        ...state,
        bulkLoading: false,
        error: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedSubscriber: action.payload,
      };

    case EMAIL_SUBSCRIBER_ACTIONS.CLEAR_SELECTED:
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

    case EMAIL_SUBSCRIBER_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: action.payload,
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