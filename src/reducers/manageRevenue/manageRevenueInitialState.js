export const manageRevenueInitialState = {
  revenues: [],
  selectedRevenue: null,
  editRevenue: null,
  loading: false,
  updating: false,
  deleting: false,
  error: "",
  search: "",
  filter: "all",
  summary: {
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    refundedOrders: 0,
  },
};
