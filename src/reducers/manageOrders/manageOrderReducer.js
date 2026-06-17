// src/reducers/manageOrders/manageOrderReducer.js

import { MANAGE_ORDER_ACTIONS } from "./manageOrderActionTypes";

// 🛡️ MANAGE ORDERS REDUCER
// Handles admin order operations with clean, predictable state updates.

export function manageOrderReducer(state, action) {
  switch (action.type) {
    case MANAGE_ORDER_ACTIONS.FETCH_START:
      return {
        ...state,
        loading: true,
        error: null,
        success: null,
      };

    case MANAGE_ORDER_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        orders: action.payload || [],
        error: null,
      };

    case MANAGE_ORDER_ACTIONS.FETCH_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to fetch orders.",
      };

    case MANAGE_ORDER_ACTIONS.SET_SELECTED_ORDER:
      return {
        ...state,
        selectedOrder: action.payload,
      };

    case MANAGE_ORDER_ACTIONS.CLEAR_SELECTED_ORDER:
      return {
        ...state,
        selectedOrder: null,
      };

    case MANAGE_ORDER_ACTIONS.SET_EDIT_ORDER:
      return {
        ...state,
        editOrder: action.payload,
      };

    case MANAGE_ORDER_ACTIONS.UPDATE_EDIT_FIELD:
      return {
        ...state,
        editOrder: {
          ...state.editOrder,
          [action.payload.name]: action.payload.value,
        },
      };

    case MANAGE_ORDER_ACTIONS.CLEAR_EDIT_ORDER:
      return {
        ...state,
        editOrder: null,
      };

    case MANAGE_ORDER_ACTIONS.UPDATE_START:
      return {
        ...state,
        updating: true,
        error: null,
        success: null,
      };

    case MANAGE_ORDER_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        orders: state.orders.map((order) =>
          order._id === action.payload._id ? action.payload : order,
        ),
        selectedOrder:
          state.selectedOrder?._id === action.payload._id
            ? action.payload
            : state.selectedOrder,
        editOrder: null,
        success: "Order updated successfully.",
      };

    case MANAGE_ORDER_ACTIONS.UPDATE_FAILURE:
      return {
        ...state,
        updating: false,
        error: action.payload || "Failed to update order.",
      };

    case MANAGE_ORDER_ACTIONS.DELETE_START:
      return {
        ...state,
        deleting: true,
        error: null,
        success: null,
      };

    case MANAGE_ORDER_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        orders: state.orders.filter((order) => order._id !== action.payload),
        selectedOrder:
          state.selectedOrder?._id === action.payload
            ? null
            : state.selectedOrder,
        editOrder:
          state.editOrder?._id === action.payload ? null : state.editOrder,
        success: "Order deleted successfully.",
      };

    case MANAGE_ORDER_ACTIONS.DELETE_FAILURE:
      return {
        ...state,
        deleting: false,
        error: action.payload || "Failed to delete order.",
      };

    case MANAGE_ORDER_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: action.payload,
      };

    case MANAGE_ORDER_ACTIONS.SET_FILTER:
      return {
        ...state,
        filter: action.payload,
      };

    case MANAGE_ORDER_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: action.payload,
      };

    case MANAGE_ORDER_ACTIONS.RESET_ERROR:
      return {
        ...state,
        error: null,
        success: null,
      };

    default:
      return state;
  }
}
