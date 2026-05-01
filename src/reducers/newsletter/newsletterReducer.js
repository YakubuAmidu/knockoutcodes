// src/reducers/newsletter/newsletterReducer.js

import { NEWSLETTER_ACTIONS } from "./newsletterActionTypes";
import { newsletterInitialState } from "./newsletterInitialState";

export default function newsletterReducer(
  state = newsletterInitialState,
  action
) {
  const { type, payload } = action;

  switch (type) {
    case NEWSLETTER_ACTIONS.SUBSCRIBE_REQUEST:
      return {
        ...state,
        loading: true,
        success: false,
        error: "",
        message: payload?.message || "Locking you in…",
        lastEmail: payload?.email || "",
        status: null,
        raw: null,
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        error: "",
        message: payload?.message || "You’re in.",
        lastEmail: payload?.email || state.lastEmail,
        status: payload?.status ?? 201,
        raw: payload?.raw || null,
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_FAIL:
      return {
        ...state,
        loading: false,
        success: false,
        error: payload?.error || "Subscription failed.",
        message: payload?.message || "Subscription failed.",
        lastEmail: state.lastEmail,
        status: payload?.status ?? 0,
        raw: payload?.raw || null,
      };

    case NEWSLETTER_ACTIONS.SUBSCRIBE_RESET:
      return {
        ...newsletterInitialState,
      };

    default:
      return state;
  }
}