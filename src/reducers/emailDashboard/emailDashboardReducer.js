import { EMAIL_DASHBOARD_ACTIONS } from "./emailDashboardActionTypes";
import { emailDashboardInitialState } from "./emailDashboardInitialState";

export function emailDashboardReducer(
  state = emailDashboardInitialState,
  action
) {
  switch (action.type) {
    case EMAIL_DASHBOARD_ACTIONS.FETCH_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case EMAIL_DASHBOARD_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        stats: action.payload?.stats || null,
        recentCampaigns: action.payload?.recentCampaigns || [],
        segmentStats: action.payload?.segmentStats || [],
        error: null,
      };

    case EMAIL_DASHBOARD_ACTIONS.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_DASHBOARD_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}