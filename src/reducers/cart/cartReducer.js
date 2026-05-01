// src/reducers/cart/cartReducer.js
import { CART_ACTIONS } from "./cartActionTypes";
import { CART_STORAGE_KEY } from "./cartInitialState";

// keep qty safe (1 to 99)
function clampQty(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.min(99, num));
}

// write to localStorage safely (never crash UI)
function persist(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors (Safari private mode etc.)
  }
}

export function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.HYDRATE_FROM_STORAGE: {
      const nextItems = Array.isArray(action.payload) ? action.payload : [];
      persist(nextItems);
      return { ...state, items: nextItems };
    }

    case CART_ACTIONS.ADD_ITEM: {
      const incoming = action.payload;

      // Guard: if payload missing, keep state safe
      if (!incoming) return state;

      const incomingId = incoming.cartItemId;
      if (!incomingId) return state;

      const exists = state.items.find((x) => x.cartItemId === incomingId);

      const nextItems = exists
        ? state.items.map((x) =>
            x.cartItemId === incomingId
              ? { ...x, qty: clampQty((x.qty || 1) + (incoming.qty || 1)) }
              : x
          )
        : [{ ...incoming, qty: clampQty(incoming.qty || 1) }, ...state.items];

      persist(nextItems);
      return { ...state, items: nextItems };
    }

    case CART_ACTIONS.UPDATE_QTY: {
      const { cartItemId, qty } = action.payload || {};
      if (!cartItemId) return state;

      const nextItems = state.items.map((x) =>
        x.cartItemId === cartItemId
          ? { ...x, qty: clampQty(qty), updatedAt: new Date().toISOString() }
          : x
      );

      persist(nextItems);
      return { ...state, items: nextItems };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const cartItemId = action.payload;
      if (!cartItemId) return state;

      const nextItems = state.items.filter((x) => x.cartItemId !== cartItemId);
      persist(nextItems);
      return { ...state, items: nextItems };
    }

    case CART_ACTIONS.CLEAR: {
      persist([]);
      return { ...state, items: [] };
    }

    default:
      return state;
  }
}
