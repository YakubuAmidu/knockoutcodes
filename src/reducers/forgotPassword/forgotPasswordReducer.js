// src/reducers/forgotPassword/forgotPasswordReducer.js

import { FORGOT_PASSWORD_ACTIONS } from "./forgotPasswordActionTypes";
import { forgotPasswordInitialState } from "./forgotPasswordInitialState";

export function forgotPasswordReducer(
  state = forgotPasswordInitialState,
  action,
) {
  switch (action.type) {
    case FORGOT_PASSWORD_ACTIONS.REQUEST_START:
      return {
        ...state,
        loading: true,
        success: false,
        error: "",
        message: "",
      };

    case FORGOT_PASSWORD_ACTIONS.REQUEST_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        error: "",
        message: action.payload?.message || "Password reset link sent.",
        emailSentTo: action.payload?.email || "",
      };

    case FORGOT_PASSWORD_ACTIONS.REQUEST_ERROR:
      return {
        ...state,
        loading: false,
        success: false,
        error: action.payload || "Something went wrong.",
      };

    case FORGOT_PASSWORD_ACTIONS.RESET:
      return forgotPasswordInitialState;

    default:
      return state;
  }
}
