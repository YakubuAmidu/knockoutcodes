// src/reducers/testimonial/testimonialActions.js

import { getAllTestimonials } from "../../lib/apiClient";
import {
  TESTIMONIAL_FETCH_START,
  TESTIMONIAL_FETCH_SUCCESS,
  TESTIMONIAL_FETCH_FAIL,
  TESTIMONIAL_CLEAR_ERROR,
} from "./testimonialActionTypes";

const sanitizeTestimonials = (list = []) => {
  const base = (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .filter(
      (t) =>
        !t?.isDeleted &&
        !t?.deleted &&
        !t?.deletedAt &&
        t?.status !== "deleted" &&
        t?.active !== false &&
        t?.visible !== false &&
        t?.isApproved !== false,
    )
    .map((t, i) => ({
      id: t._id || t.id || String(i),
      name:
        String(
          t.name ||
            t.fullName ||
            t.username ||
            t.user?.name ||
            t.user?.fullName ||
            t.user?.username ||
            "",
        ).trim() || "Verified Member",
      imageUrl: t.imageUrl || t.image || "",
      message: String(t.message || "").trim(),
      rating: Math.max(1, Math.min(5, Number(t.rating ?? 5))),
      createdAt: t.createdAt ? String(t.createdAt) : null,
    }))
    .filter((t) => t.message.length > 0);

  const seenIds = new Set();

  return base
    .filter((t) => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : -1;

      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : -1;

      return bTime - aTime;
    });
};

export const fetchTestimonials = () => async (dispatch) => {
  dispatch({ type: TESTIMONIAL_FETCH_START });

  try {
    const list = await getAllTestimonials();
    const cleaned = sanitizeTestimonials(list);

    dispatch({
      type: TESTIMONIAL_FETCH_SUCCESS,
      payload: cleaned,
    });
  } catch (error) {
    dispatch({
      type: TESTIMONIAL_FETCH_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load testimonials.",
    });
  }
};

export const clearTestimonialError = () => ({
  type: TESTIMONIAL_CLEAR_ERROR,
});
