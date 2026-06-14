// utils/csrf.js

import axiosInstance from "./axiosInstance";

export async function getCsrfToken() {
  const response = await axiosInstance.get("/csrf-token");
  return response?.data?.csrfToken || response?.data?.csrf || "";
}

export default getCsrfToken;
