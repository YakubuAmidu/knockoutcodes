export const emailCampaignInitialState = {
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  sending: false,
  analyticsLoading: false,

  campaigns: [],
  selectedCampaign: null,
  analytics: null,

  successMessage: null,
  error: null,
  pagination: null,
};