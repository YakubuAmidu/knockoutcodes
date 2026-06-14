export const emailSubscriberInitialState = {
  loading: false,
  detailsLoading: false,
  creating: false,
  updating: false,
  deleting: false,
  bulkLoading: false,

  subscribers: [],
  selectedSubscriber: null,

  summary: {
    totalAll: 0,
    active: 0,
    unsubscribed: 0,
    bounced: 0,
    blocked: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
  },

  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  },

  search: "",
  filter: "all",
  sort: "newest",

  error: null,
  success: false,
  successMessage: "",
};