import { EMAIL_ANALYTICS_ACTIONS } from "./emailAnalyticsActionTypes";
import { emailAnalyticsInitialState } from "./emailAnalyticsInitialState";

export function emailAnalyticsReducer(
  state = emailAnalyticsInitialState,
  action
) {
  switch (action.type) {
    case EMAIL_ANALYTICS_ACTIONS.FETCH_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case EMAIL_ANALYTICS_ACTIONS.FETCH_SUCCESS:
  return {
    ...state,
    loading: false,
    analytics: action.payload || null,
    chartData: action.payload?.recentCampaigns || [],
    error: null,
  };

    case EMAIL_ANALYTICS_ACTIONS.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_ANALYTICS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}