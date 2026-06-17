// src/reducers/manageOrders/manageOrderInitialState.js

// 💎 MANAGE ORDERS INITIAL STATE
// Built for a luxury admin dashboard experience with clean state control.

export const manageOrderInitialState = {
  orders: [],
  selectedOrder: null,
  editOrder: null,

  loading: false,
  updating: false,
  deleting: false,

  error: null,
  success: null,

  search: "",
  filter: "all",
  sort: "newest",
};
