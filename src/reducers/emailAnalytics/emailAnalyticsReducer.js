import { EMAIL_ANALYTICS_ACTIONS } from "./emailAnalyticsActionTypes";
import { emailAnalyticsInitialState } from "./emailAnalyticsInitialState";

export function emailAnalyticsReducer(
  state = emailAnalyticsInitialState,
  action,
) {
  switch (action.type) {
    /* ======================================================
       GLOBAL ANALYTICS LIST
    ====================================================== */
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
        analytics: action.payload?.analytics || null,
        total: action.payload?.total || 0,
        page: action.payload?.page || 1,
        pages: action.payload?.pages || 1,
        chartData: action.payload?.chartData || [],
        error: null,
      };

    case EMAIL_ANALYTICS_ACTIONS.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    /* ======================================================
       CAMPAIGN ANALYTICS DETAIL
    ====================================================== */
    case EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_REQUEST:
      return {
        ...state,
        campaignLoading: true,
        campaignError: null,
      };

    case EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_SUCCESS:
      return {
        ...state,
        campaignLoading: false,
        selectedCampaign: action.payload?.campaign || null,
        campaignTotals: action.payload?.totals || {},
        campaignRates: action.payload?.rates || {},
        recentEvents: action.payload?.recentEvents || [],
        campaignError: null,
      };

    case EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_FAIL:
      return {
        ...state,
        campaignLoading: false,
        campaignError: action.payload,
      };

    /* ======================================================
       SUCCESS / ERROR
    ====================================================== */
    case EMAIL_ANALYTICS_ACTIONS.SET_SUCCESS:
      return {
        ...state,
        successMessage: action.payload,
      };

    case EMAIL_ANALYTICS_ACTIONS.RESET_SUCCESS:
      return {
        ...state,
        successMessage: null,
      };

    case EMAIL_ANALYTICS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        campaignError: null,
      };

    /* ======================================================
       RESET STATE
    ====================================================== */
    case EMAIL_ANALYTICS_ACTIONS.RESET_STATE:
      return {
        ...emailAnalyticsInitialState,
      };

    default:
      return state;
  }
}
