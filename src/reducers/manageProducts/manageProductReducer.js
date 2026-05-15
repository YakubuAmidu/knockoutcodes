// src/reducers/manageProducts/manageProductReducer.js

import { MANAGE_PRODUCT_ACTION_TYPES } from "./manageProductActionTypes.js";

export function manageProductReducer(state, action) {
  switch (action.type) {
    case MANAGE_PRODUCT_ACTION_TYPES.FETCH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MANAGE_PRODUCT_ACTION_TYPES.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    case MANAGE_PRODUCT_ACTION_TYPES.FETCH_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load products.",
      };

    case MANAGE_PRODUCT_ACTION_TYPES.SAVE_START:
      return {
        ...state,
        saving: true,
        error: null,
      };

    case MANAGE_PRODUCT_ACTION_TYPES.SAVE_SUCCESS: {
      const product = action.payload;
      const productId = product?._id || product?.id;

      if (!productId) {
        return {
          ...state,
          saving: false,
        };
      }

      const exists = state.items.some((item) => {
        const itemId = item?._id || item?.id;
        return itemId === productId;
      });

      return {
        ...state,
        saving: false,
        items: exists
          ? state.items.map((item) => {
              const itemId = item?._id || item?.id;
              return itemId === productId ? product : item;
            })
          : [product, ...state.items],
        error: null,
      };
    }

    case MANAGE_PRODUCT_ACTION_TYPES.SAVE_ERROR:
      return {
        ...state,
        saving: false,
        error: action.payload || "Failed to save product.",
      };

    case MANAGE_PRODUCT_ACTION_TYPES.DELETE_START:
      return {
        ...state,
        deletingId: action.payload,
        error: null,
      };

    case MANAGE_PRODUCT_ACTION_TYPES.DELETE_SUCCESS:
      return {
        ...state,
        deletingId: null,
        items: state.items.filter((item) => {
          const itemId = item?._id || item?.id;
          return itemId !== action.payload;
        }),
        error: null,
      };

    case MANAGE_PRODUCT_ACTION_TYPES.DELETE_ERROR:
      return {
        ...state,
        deletingId: null,
        error: action.payload || "Failed to delete product.",
      };

    case MANAGE_PRODUCT_ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}