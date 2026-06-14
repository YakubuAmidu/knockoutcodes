// src/reducers/myOrders/myOrderReducer.js

import * as types from "./myOrderActionTypes";
import { myOrderInitialState } from "./myOrderInitialState";

export function myOrderReducer(state = myOrderInitialState, action) {
  switch (action.type) {
    case types.MY_ORDERS_FETCH_START:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case types.MY_ORDERS_FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        orders: action.payload.orders || [],
        total: action.payload.total || 0,
        pages: action.payload.pages || 1,
        page: action.payload.page || state.page,
      };

    case types.MY_ORDERS_FETCH_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load orders.",
      };

    case types.MY_ORDERS_SET_PAGE:
      return {
        ...state,
        page: action.payload,
      };

    case types.MY_ORDERS_REFRESH:
      return {
        ...state,
        refreshKey: state.refreshKey + 1,
      };

    case types.MY_ORDERS_RESET:
      return myOrderInitialState;

    default:
      return state;
  }
}