import { MEMBERSHIP_ACTIONS } from "./membershipActionTypes";
import { membershipInitialState } from "./membershipInitialState";


export function membershipReducer(state = membershipInitialState, action) {
  switch (action.type) {
    case MEMBERSHIP_ACTIONS.FETCH_START:
      return { ...state, loading: true, error: "" };
    
    case MEMBERSHIP_ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, items: action.payload || [], error: "" };
    
    case MEMBERSHIP_ACTIONS.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload || "Failed to load memberships" };
    
    case MEMBERSHIP_ACTIONS.START_CHECKOUT:
      return { ...state, startingId: action.payload || "", error: "" };
    
    case MEMBERSHIP_ACTIONS.STOP_CHECKOUT:
      return { ...state, startingId: "" };
    
    case MEMBERSHIP_ACTIONS.CLEAR_ERROR:
      return { ...state, error: "" };
    
    default: 
      return state
  }
}