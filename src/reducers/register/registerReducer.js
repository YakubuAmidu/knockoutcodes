import { REGISTER_ACTIONS } from "./registerActionTypes";
import { registerInitialState } from "./registerInitialState";

export default function registerReducer(state = registerInitialState, action) {
  switch (action.type) {
    case REGISTER_ACTIONS.UPDATE_FIELD:
      return {
        ...state,
        error: "",
        form: {
          ...state.form,
          [action.payload.name]: action.payload.value,
        },
      };

    case REGISTER_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case REGISTER_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: "",
      };

    case REGISTER_ACTIONS.REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
        success: false,
      };

    case REGISTER_ACTIONS.SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        success: true,
      };

    case REGISTER_ACTIONS.FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Registration failed.",
        success: false,
      };

    case REGISTER_ACTIONS.RESET:
      return registerInitialState;

    default:
      return state;
  }
}
