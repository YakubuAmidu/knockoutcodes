export const membershipInitialState = {
  items: [],
  loading: false,
  error: "",

  startingId: "",
  switchingId: "",
  canceling: false,

  mySubscriptionLoading: false,
  mySubscriptionError: "",

  mySubscription: {
    hasSubscription: false,
    isActive: false,
    status: "none",
    membershipId: null,
    billingPeriod: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
};
