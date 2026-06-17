import { MEMBERSHIP_ACTIONS } from "./membershipActionTypes";
import { membershipInitialState } from "./membershipInitialState";

export function membershipReducer(state = membershipInitialState, action) {
  switch (action.type) {
    case MEMBERSHIP_ACTIONS.FETCH_START:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case MEMBERSHIP_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case MEMBERSHIP_ACTIONS.FETCH_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load memberships",
      };

    case MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_START:
      return {
        ...state,
        mySubscriptionLoading: true,
        mySubscriptionError: "",
      };

    case MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_SUCCESS:
      return {
        ...state,
        mySubscriptionLoading: false,
        mySubscriptionError: "",
        mySubscription: {
          ...membershipInitialState.mySubscription,
          ...(action.payload || {}),
        },
      };

    case MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_ERROR:
      return {
        ...state,
        mySubscriptionLoading: false,
        mySubscriptionError:
          action.payload || "Failed to load your subscription",
      };

    case MEMBERSHIP_ACTIONS.START_CHECKOUT:
      return {
        ...state,
        startingId: action.payload || "",
        error: "",
      };

    case MEMBERSHIP_ACTIONS.STOP_CHECKOUT:
      return {
        ...state,
        startingId: "",
      };

    case MEMBERSHIP_ACTIONS.START_SWITCH:
      return {
        ...state,
        switchingId: action.payload || "",
        error: "",
      };

    case MEMBERSHIP_ACTIONS.STOP_SWITCH:
      return {
        ...state,
        switchingId: "",
      };

    case MEMBERSHIP_ACTIONS.START_CANCEL:
      return {
        ...state,
        canceling: true,
        error: "",
      };

    case MEMBERSHIP_ACTIONS.STOP_CANCEL:
      return {
        ...state,
        canceling: false,
      };

    case MEMBERSHIP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: "",
        mySubscriptionError: "",
      };

    case MEMBERSHIP_ACTIONS.RESET:
      return membershipInitialState;

    default:
      return state;
  }
}
