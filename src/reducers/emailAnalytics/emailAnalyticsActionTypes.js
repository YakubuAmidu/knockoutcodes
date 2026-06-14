export const EMAIL_ANALYTICS_ACTIONS = {
  /* ======================================================
     GLOBAL ANALYTICS
  ====================================================== */
  FETCH_REQUEST: "EMAIL_ANALYTICS/FETCH_REQUEST",
  FETCH_SUCCESS: "EMAIL_ANALYTICS/FETCH_SUCCESS",
  FETCH_FAIL: "EMAIL_ANALYTICS/FETCH_FAIL",

  /* ======================================================
     CAMPAIGN ANALYTICS DETAIL
  ====================================================== */
  CAMPAIGN_FETCH_REQUEST:
    "EMAIL_ANALYTICS/CAMPAIGN_FETCH_REQUEST",

  CAMPAIGN_FETCH_SUCCESS:
    "EMAIL_ANALYTICS/CAMPAIGN_FETCH_SUCCESS",

  CAMPAIGN_FETCH_FAIL:
    "EMAIL_ANALYTICS/CAMPAIGN_FETCH_FAIL",

  /* ======================================================
     SUCCESS
  ====================================================== */
  SET_SUCCESS: "EMAIL_ANALYTICS/SET_SUCCESS",
  RESET_SUCCESS: "EMAIL_ANALYTICS/RESET_SUCCESS",

  /* ======================================================
     ERRORS
  ====================================================== */
  CLEAR_ERROR: "EMAIL_ANALYTICS/CLEAR_ERROR",

  /* ======================================================
     RESET
  ====================================================== */
  RESET_STATE: "EMAIL_ANALYTICS/RESET_STATE",
};