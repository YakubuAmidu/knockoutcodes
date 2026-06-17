// src/reducers/myOrders/myOrderActions.js

import { getMyOrders } from "../../lib/apiClient";
import * as types from "./myOrderActionTypes";

const LIMIT = 12;

function getErrorMessage(error, fallback = "Failed to load your orders.") {
  return error?.response?.data?.message || error?.message || fallback;
}

/* =========================
   Fetch My Orders
========================= */
export const fetchMyOrders =
  ({ page = 1, signal } = {}) =>
  async (dispatch) => {
    dispatch({ type: types.MY_ORDERS_FETCH_START });

    try {
      const data = await getMyOrders({
        page,
        limit: LIMIT,
        signal,
      });

      const orders = Array.isArray(data?.data) ? data.data : [];
      const pages = Math.max(1, Number(data?.pagination?.pages || 1));
      const total = Number(data?.pagination?.total || orders.length || 0);

      dispatch({
        type: types.MY_ORDERS_FETCH_SUCCESS,
        payload: {
          orders,
          pages,
          total,
          page: page > pages ? pages : page,
        },
      });

      return { ok: true, orders };
    } catch (error) {
      if (signal?.aborted || error?.code === "ERR_CANCELED") {
        return { ok: false, cancelled: true };
      }

      const message = getErrorMessage(error);

      dispatch({
        type: types.MY_ORDERS_FETCH_FAILURE,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Pagination
========================= */
export const setMyOrdersPage = (page) => ({
  type: types.MY_ORDERS_SET_PAGE,
  payload: Math.max(1, Number(page) || 1),
});

/* =========================
   Refresh
========================= */
export const refreshMyOrders = () => ({
  type: types.MY_ORDERS_REFRESH,
});

/* =========================
   Reset
========================= */
export const resetMyOrders = () => ({
  type: types.MY_ORDERS_RESET,
});
