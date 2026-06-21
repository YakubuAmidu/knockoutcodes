// src/utils/csrf.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://knockoutcodes.onrender.com/api/v1";

const CSRF_STORAGE_KEY = "kc_csrf_token";

let csrfTokenMemory = "";
let csrfPromise = null;

function getCookie(name) {
  try {
    if (typeof document === "undefined") return "";

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escaped}=([^;]*)`),
    );

    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getStoredToken() {
  try {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(CSRF_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredToken(token) {
  try {
    if (typeof window === "undefined" || !token) return;
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export async function getCsrfToken({ force = false } = {}) {
  const cookieToken = getCookie("csrfToken");
  const storedToken = getStoredToken();

  if (!force && cookieToken) {
    csrfTokenMemory = cookieToken;
    setStoredToken(cookieToken);
    return cookieToken;
  }

  if (!force && csrfTokenMemory) {
    return csrfTokenMemory;
  }

  if (!force && storedToken) {
    csrfTokenMemory = storedToken;
    return storedToken;
  }

  if (!csrfPromise) {
    csrfPromise = axios
      .get(`${API_BASE_URL}/auth/csrf`, {
        withCredentials: true,
        timeout: 10000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      .then((res) => {
        const token =
          res?.data?.csrfToken ||
          res?.data?.token ||
          res?.data?.data?.csrfToken ||
          res?.data?.data?.token ||
          getCookie("csrfToken") ||
          "";

        csrfTokenMemory = token;
        setStoredToken(token);

        return token;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

export function clearCsrfToken() {
  csrfTokenMemory = "";

  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export default getCsrfToken;
