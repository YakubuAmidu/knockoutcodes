// src/reducers/resetPassword/resetPasswordReducer.js

import { RESET_PASSWORD_ACTIONS } from "./resetPasswordActionTypes";
import { resetPasswordInitialState } from "./resetPasswordInitialState";

export function resetPasswordReducer(state = resetPasswordInitialState, action) {
  switch (action.type) {
    case RESET_PASSWORD_ACTIONS.REQUEST_START:
      return {
        ...state,
        loading: true,
        success: false,
        message: "",
        error: "",
      };

    case RESET_PASSWORD_ACTIONS.REQUEST_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        message: action.payload || "Password reset successful.",
        error: "",
      };

    case RESET_PASSWORD_ACTIONS.REQUEST_ERROR:
      return {
        ...state,
        loading: false,
        success: false,
        message: "",
        error: action.payload || "Unable to reset password.",
      };

    case RESET_PASSWORD_ACTIONS.RESET:
      return resetPasswordInitialState;

    default:
      return state;
  }
}