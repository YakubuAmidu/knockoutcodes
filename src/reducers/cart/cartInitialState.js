// src/reducers/cart/cartInitialState.js
function safeParseCart(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CART_STORAGE_KEY = "kc_cart";

export const cartInitialState = {
  items: safeParseCart(localStorage.getItem(CART_STORAGE_KEY)),
};
