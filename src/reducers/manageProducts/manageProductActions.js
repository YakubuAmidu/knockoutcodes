// src/reducers/manageProducts/manageProductActions.js

import { MANAGE_PRODUCT_ACTION_TYPES } from "./manageProductActionTypes";

export const manageProductActions = {
  fetchStart: () => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.FETCH_START,
  }),

  fetchSuccess: (products) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.FETCH_SUCCESS,
    payload: products,
  }),

  fetchError: (message) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.FETCH_ERROR,
    payload: message,
  }),

  saveStart: () => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.SAVE_START,
  }),

  saveSuccess: (product) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.SAVE_SUCCESS,
    payload: product,
  }),

  saveError: (message) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.SAVE_ERROR,
    payload: message,
  }),

  deleteStart: (id) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.DELETE_START,
    payload: id,
  }),

  deleteSuccess: (id) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.DELETE_SUCCESS,
    payload: id,
  }),

  deleteError: (message) => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.DELETE_ERROR,
    payload: message,
  }),

  clearError: () => ({
    type: MANAGE_PRODUCT_ACTION_TYPES.CLEAR_ERROR,
  }),
};
