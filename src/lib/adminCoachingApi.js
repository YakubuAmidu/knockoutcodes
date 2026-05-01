// src/lib/adminCoachingsApi.js
import axiosInstance from "../../utils/axiosInstance";

const BASE = "/coachings/admin";

export async function fetchAdminCoachings({ page = 1, limit = 20, q = "" }) {
  const params = { page, limit };
  if (q && String(q).trim()) params.q = String(q).trim();
  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

export async function updateAdminCoaching(id, updates) {
  const { data } = await axiosInstance.put(`${BASE}/${id}`, updates);
  return data;
}

export async function deleteAdminCoaching(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}
