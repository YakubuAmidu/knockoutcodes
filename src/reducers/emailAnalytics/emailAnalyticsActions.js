// src/reducers/emailAnalytics/emailAnalyticsActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_ANALYTICS_ACTIONS } from "./emailAnalyticsActionTypes";

const ADMIN_EMAIL_ANALYTICS_OVERVIEW_URL =
  "/admin/email-campaigns/analytics/overview";

const ADMIN_EMAIL_ANALYTICS_DETAIL_URL = "/admin/email-campaigns/analytics";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const unwrapBody = (response) =>
  response?.data?.success !== undefined ? response.data : response;

export const fetchEmailAnalytics =
  ({ page = 1, limit = 20, q = "", eventType = "all", campaignId = "" } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: EMAIL_ANALYTICS_ACTIONS.FETCH_REQUEST });

      const params = { page, limit };
      if (q?.trim()) params.q = q.trim();
      if (eventType && eventType !== "all") params.eventType = eventType;
      if (campaignId) params.campaignId = campaignId;

      const response = await axiosInstance.get(
        ADMIN_EMAIL_ANALYTICS_OVERVIEW_URL,
        { params },
      );

      const body = unwrapBody(response);
      const rawData = body?.data || {};
      const overview = rawData?.overview || {};
      const campaigns = Array.isArray(rawData?.campaigns)
        ? rawData.campaigns
        : [];

      const recentCampaigns = campaigns.map((item) => ({
        ...(item?.campaign || {}),
        totalRecipients:
          item?.totals?.recipients ?? item?.campaign?.totalRecipients ?? 0,
        totalSent: item?.totals?.sent ?? item?.campaign?.totalSent ?? 0,
        totalFailed: item?.totals?.failed ?? item?.campaign?.totalFailed ?? 0,
        totalOpened: item?.totals?.opened ?? 0,
        totalClicked: item?.totals?.clicked ?? 0,
      }));

      const analytics = {
        cards: {
          totalCampaigns: overview.totalCampaigns || 0,
          totalSent: recentCampaigns.reduce(
            (sum, item) => sum + Number(item.totalSent || 0),
            0,
          ),
          totalFailed: overview.failed || 0,
          totalRecipients: recentCampaigns.reduce(
            (sum, item) => sum + Number(item.totalRecipients || 0),
            0,
          ),
        },
        engagement: {
          openRate: overview.openRate || 0,
          clickRate: overview.clickRate || 0,
          unsubscribeRate: overview.unsubscribeRate || 0,
          failureRate: overview.failureRate || 0,
        },
        recentCampaigns,
      };

      dispatch({
        type: EMAIL_ANALYTICS_ACTIONS.FETCH_SUCCESS,
        payload: {
          analytics,
          total: recentCampaigns.length,
          page,
          pages: body?.pagination?.pages || 1,
          chartData: recentCampaigns,
        },
      });

      return analytics;
    } catch (error) {
      dispatch({
        type: EMAIL_ANALYTICS_ACTIONS.FETCH_FAIL,
        payload: getErrorMessage(error, "Failed to fetch analytics"),
      });

      return null;
    }
  };

export const fetchEmailCampaignAnalyticsById =
  (campaignId) => async (dispatch) => {
    try {
      dispatch({ type: EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_REQUEST });

      if (!campaignId) {
        throw new Error("Campaign ID is required.");
      }

      const response = await axiosInstance.get(
        `${ADMIN_EMAIL_ANALYTICS_DETAIL_URL}/${campaignId}`,
      );

      const body = unwrapBody(response);
      const raw = body?.data || body || {};

      const campaign =
        raw?.campaign ||
        raw?.campaignAnalytics?.campaign ||
        raw?.data?.campaign ||
        null;

      const totals =
        raw?.totals ||
        raw?.campaignAnalytics?.totals ||
        raw?.data?.totals ||
        {};

      const rates =
        raw?.rates ||
        raw?.engagement ||
        raw?.campaignAnalytics?.rates ||
        raw?.campaignAnalytics?.engagement ||
        raw?.data?.rates ||
        raw?.data?.engagement ||
        {};

      const recentEvents =
        raw?.recentEvents ||
        raw?.recentActivity ||
        raw?.events ||
        raw?.logs ||
        raw?.data?.recentEvents ||
        raw?.data?.recentActivity ||
        [];

      const detail = {
        campaign,
        totals,
        rates,
        engagement: rates,
        recentEvents: Array.isArray(recentEvents) ? recentEvents : [],
      };

      dispatch({
        type: EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_SUCCESS,
        payload: detail,
      });

      return detail;
    } catch (error) {
      dispatch({
        type: EMAIL_ANALYTICS_ACTIONS.CAMPAIGN_FETCH_FAIL,
        payload: getErrorMessage(error, "Failed to fetch campaign analytics"),
      });

      return null;
    }
  };

export const refreshEmailAnalytics =
  (options = {}) =>
  async (dispatch) => {
    dispatch({ type: EMAIL_ANALYTICS_ACTIONS.RESET_SUCCESS });
    return dispatch(fetchEmailAnalytics(options));
  };

export const clearEmailAnalyticsError = () => ({
  type: EMAIL_ANALYTICS_ACTIONS.CLEAR_ERROR,
});

export const resetEmailAnalytics = () => ({
  type: EMAIL_ANALYTICS_ACTIONS.RESET_STATE,
});
