// src/reducers/manageOrders/manageOrderActions.js

import { MANAGE_ORDER_ACTIONS } from "./manageOrderActionTypes";

// ⚡ MANAGE ORDERS ACTION CREATORS
// Clean helper actions for a premium admin order workflow.

export const fetchManageOrdersStart = () => ({
  type: MANAGE_ORDER_ACTIONS.FETCH_START,
});

export const fetchManageOrdersSuccess = (orders) => ({
  type: MANAGE_ORDER_ACTIONS.FETCH_SUCCESS,
  payload: orders,
});

export const fetchManageOrdersFailure = (error) => ({
  type: MANAGE_ORDER_ACTIONS.FETCH_FAILURE,
  payload: error,
});

export const setSelectedManageOrder = (order) => ({
  type: MANAGE_ORDER_ACTIONS.SET_SELECTED_ORDER,
  payload: order,
});

export const clearSelectedManageOrder = () => ({
  type: MANAGE_ORDER_ACTIONS.CLEAR_SELECTED_ORDER,
});

export const setEditManageOrder = (order) => ({
  type: MANAGE_ORDER_ACTIONS.SET_EDIT_ORDER,
  payload: order,
});

export const updateManageOrderField = (name, value) => ({
  type: MANAGE_ORDER_ACTIONS.UPDATE_EDIT_FIELD,
  payload: { name, value },
});

export const clearEditManageOrder = () => ({
  type: MANAGE_ORDER_ACTIONS.CLEAR_EDIT_ORDER,
});

export const updateManageOrderStart = () => ({
  type: MANAGE_ORDER_ACTIONS.UPDATE_START,
});

export const updateManageOrderSuccess = (order) => ({
  type: MANAGE_ORDER_ACTIONS.UPDATE_SUCCESS,
  payload: order,
});

export const updateManageOrderFailure = (error) => ({
  type: MANAGE_ORDER_ACTIONS.UPDATE_FAILURE,
  payload: error,
});

export const deleteManageOrderStart = () => ({
  type: MANAGE_ORDER_ACTIONS.DELETE_START,
});

export const deleteManageOrderSuccess = (orderId) => ({
  type: MANAGE_ORDER_ACTIONS.DELETE_SUCCESS,
  payload: orderId,
});

export const deleteManageOrderFailure = (error) => ({
  type: MANAGE_ORDER_ACTIONS.DELETE_FAILURE,
  payload: error,
});

export const setManageOrderSearch = (value) => ({
  type: MANAGE_ORDER_ACTIONS.SET_SEARCH,
  payload: value,
});

export const setManageOrderFilter = (value) => ({
  type: MANAGE_ORDER_ACTIONS.SET_FILTER,
  payload: value,
});

export const setManageOrderSort = (value) => ({
  type: MANAGE_ORDER_ACTIONS.SET_SORT,
  payload: value,
});

export const resetManageOrderError = () => ({
  type: MANAGE_ORDER_ACTIONS.RESET_ERROR,
});