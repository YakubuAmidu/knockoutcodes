export const emailAnalyticsInitialState = {
  loading: false,
  analytics: null,
  chartData: [],

  total: 0,
  page: 1,
  pages: 1,

  campaignLoading: false,
  selectedCampaign: null,
  campaignTotals: {},
  campaignRates: {},
  recentEvents: [],
  campaignError: null,

  successMessage: null,
  error: null,
};
