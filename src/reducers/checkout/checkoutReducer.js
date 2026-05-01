import { CHECKOUT_ACTIONS } from "./checkoutActionTypes";
import { checkoutInitialState } from "./checkoutInitialState";

export function checkoutReducer(state = checkoutInitialState, action) {
  switch (action.type) {
    case CHECKOUT_ACTIONS.START:
      return { ...state, loading: true, error: "", lastSessionId: null };

    case CHECKOUT_ACTIONS.SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        lastSessionId: action.payload?.id || null,
      };

    case CHECKOUT_ACTIONS.ERROR:
      return { ...state, loading: false, error: action.payload || "Checkout failed." };

    case CHECKOUT_ACTIONS.CLEAR:
      return { ...checkoutInitialState };

    default:
      return state;
  }
}
