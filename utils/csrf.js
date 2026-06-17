// src/utils/csrf.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://knockoutcodes.onrender.com/api/v1";

let csrfTokenMemory = "";
let csrfPromise = null;

function getCookie(name) {
  try {
    if (typeof document === "undefined") return "";

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escaped}=([^;]*)`)
    );

    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

export async function getCsrfToken({ force = false } = {}) {
  const cookieToken = getCookie("csrfToken");

  if (!force && cookieToken) {
    csrfTokenMemory = cookieToken;
    return cookieToken;
  }

  if (!force && csrfTokenMemory) {
    return csrfTokenMemory;
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
}

export default getCsrfToken;