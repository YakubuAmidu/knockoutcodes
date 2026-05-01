// src/reducers/products/productReducer.js
import { PRODUCT_ACTIONS } from "./productActionTypes";

export function productReducer(state, action) {
  switch (action.type) {
    case PRODUCT_ACTIONS.FETCH_START:
      return { ...state, loading: true, error: "" };

    case PRODUCT_ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, items: action.payload || [], error: "" };

    case PRODUCT_ACTIONS.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload || "Failed to load products." };

    case PRODUCT_ACTIONS.SAVE_START:
      return { ...state, saving: true, error: "" };

    case PRODUCT_ACTIONS.SAVE_SUCCESS: {
      const updated = action.payload;
      const updatedId = updated?._id || updated?.id;
      const exists = state.items.some((p) => (p?._id || p?.id) === updatedId);

      const nextItems = exists
        ? state.items.map((p) => ((p?._id || p?.id) === updatedId ? updated : p))
        : [updated, ...state.items];

      return { ...state, saving: false, items: nextItems, error: "" };
    }

    case PRODUCT_ACTIONS.SAVE_ERROR:
      return { ...state, saving: false, error: action.payload || "Save failed." };

    case PRODUCT_ACTIONS.DELETE_START:
      return { ...state, deletingId: action.payload, error: "" };

    case PRODUCT_ACTIONS.DELETE_SUCCESS: {
      const id = action.payload;
      return {
        ...state,
        deletingId: null,
        items: state.items.filter((p) => (p?._id || p?.id) !== id),
        error: "",
      };
    }

    case PRODUCT_ACTIONS.DELETE_ERROR:
      return { ...state, deletingId: null, error: action.payload || "Delete failed." };

    // ✅ pro add-ons
    case PRODUCT_ACTIONS.SET_SELECTED:
      return { ...state, selected: action.payload || null };

    case PRODUCT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: "" };

    default:
      return state;
  }
}
