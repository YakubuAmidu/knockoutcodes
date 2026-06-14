import {
  MY_PRODUCTS_REQUEST,
  MY_PRODUCTS_SUCCESS,
  MY_PRODUCTS_FAIL,
  MY_PRODUCTS_CLEAR_ERROR,
} from "./myProductActionTypes";
import { myProductInitialState } from "./myProductInitialState";

export function myProductReducer(state = myProductInitialState, action) {
  switch (action.type) {
    case MY_PRODUCTS_REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case MY_PRODUCTS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        products: action.payload.products || [],
        orders: action.payload.orders || [],
        totalProducts: action.payload.totalProducts || 0,
        totalQuantity: action.payload.totalQuantity || 0,
        totalSpent: action.payload.totalSpent || 0,
      };

    case MY_PRODUCTS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load purchased products.",
      };

    case MY_PRODUCTS_CLEAR_ERROR:
      return {
        ...state,
        error: "",
      };

    default:
      return state;
  }
}