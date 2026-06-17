import { NEWSLETTER_ACTIONS } from "./newsletterActionTypes";
import { newsletterInitialState } from "./newsletterInitialState";

const safeString = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;

export default function newsletterReducer(
  state = newsletterInitialState,
  action = {},
) {
  const { type, payload = {} } = action;

  switch (type) {
    case NEWSLETTER_ACTIONS.SUBSCRIBE_REQUEST:
      return {
        ...state,
        loading: true,
        success: false,
        error: "",
        message: safeString(payload.message, "Securing your spot…"),
        lastEmail: safeString(payload.email),
        status: null,
        raw: null,
        updatedAt: Date.now(),
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        error: "",
        message: safeString(payload.message, "You’re in."),
        lastEmail: safeString(payload.email) || state.lastEmail,
        status: typeof payload.status === "number" ? payload.status : 201,
        raw: payload.raw || null,
        updatedAt: Date.now(),
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL:
      return {
        ...state,
        loading: false,
        success: false,
        error: safeString(payload.error, "Subscription failed."),
        message: safeString(payload.message, "Subscription failed."),
        status: typeof payload.status === "number" ? payload.status : 0,
        raw: payload.raw || null,
        updatedAt: Date.now(),
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_RESET:
      return {
        ...newsletterInitialState,
        updatedAt: Date.now(),
      };

    default:
      return state;
  }
}
