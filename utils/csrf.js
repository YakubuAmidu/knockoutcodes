import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export async function getCsrfToken() {
  const res = await axios.get(`${API_BASE_URL}/auth/csrf`, {
    withCredentials: true,
  });

  return res.data?.csrfToken;
}