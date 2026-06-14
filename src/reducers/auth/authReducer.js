import { AUTH_ACTIONS } from "./authActionTypes";
import { authInitialState } from "./authInitialState";

export function authReducer(state = authInitialState, action) {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isAdmin: action.payload?.role === "admin",
        error: null,
      };

    case AUTH_ACTIONS.AUTH_FAIL:
      return {
        ...state,
        loading: false,
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.AUTH_LOGOUT:
      return {
        ...authInitialState,
      };
    
    case AUTH_ACTIONS.ACCOUNT_ACCESS_RESTRICTED:
  return {
    ...authInitialState,
    error: action.payload?.message || "Account access restricted.",
  };

    case AUTH_ACTIONS.AUTH_CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}