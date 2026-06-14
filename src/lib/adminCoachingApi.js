// src/lib/adminCoachingApi.js
import axiosInstance from "../../utils/axiosInstance";

const BASE = "/coachings/admin";

function cleanId(id) {
  return String(id || "").trim();
}

export async function fetchAdminCoachings({
  page = 1,
  limit = 20,
  q = "",
  sort = "-createdAt",
} = {}) {
  const params = {
    page: Math.max(1, Number(page) || 1),
    limit: Math.min(100, Math.max(10, Number(limit) || 20)),
    sort: sort === "createdAt" ? "createdAt" : "-createdAt",
  };

  const search = String(q || "").trim();
  if (search) params.q = search.slice(0, 60);

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

export async function updateAdminCoaching(id, updates = {}) {
  const safeId = cleanId(id);
  if (!safeId) throw new Error("Missing coaching id.");

  const { data } = await axiosInstance.put(`${BASE}/${safeId}`, updates);
  return data;
}

export async function deleteAdminCoaching(id) {
  const safeId = cleanId(id);
  if (!safeId) throw new Error("Missing coaching id.");

  const { data } = await axiosInstance.delete(`${BASE}/${safeId}`);
  return data;
}