import axiosInstance from "../../../utils/axiosInstance";

import {
  MANAGE_TESTIMONIAL_REQUEST,
  MANAGE_TESTIMONIAL_SUCCESS,
  MANAGE_TESTIMONIAL_FAIL,
  MANAGE_TESTIMONIAL_ACTION_REQUEST,
  MANAGE_TESTIMONIAL_ACTION_FINISH,
  UPDATE_TESTIMONIAL_SUCCESS,
  DELETE_TESTIMONIAL_SUCCESS,
} from "./manageTestimonialActionTypes";

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const normalizeTestimonials = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.testimonials)
      ? payload.testimonials
      : [];

  return list
    .filter(Boolean)
    .map((item) => ({
      ...item,
      _id: item?._id || item?.id,
      imageUrl: item?.imageUrl || item?.image || item?.user?.image || "",
      approved:
        item?.approved === true ||
        item?.isApproved === true ||
        item?.status === "approved",
      rating: Math.max(1, Math.min(5, Number(item?.rating ?? 5))),
      message: String(
        item?.message || item?.review || item?.comment || "",
      ).trim(),
      name: String(
        item?.name ||
          item?.user?.name ||
          item?.user?.fullName ||
          item?.user?.username ||
          "Verified Member",
      ).trim(),
    }))
    .filter((item) => item?._id);
};

export const fetchAdminTestimonials = async (dispatch) => {
  try {
    dispatch({ type: MANAGE_TESTIMONIAL_REQUEST });

    const { data } = await axiosInstance.get("/testimonials/admin");

    dispatch({
      type: MANAGE_TESTIMONIAL_SUCCESS,
      payload: normalizeTestimonials(data?.testimonials || data || []),
    });

    return true;
  } catch (error) {
    dispatch({
      type: MANAGE_TESTIMONIAL_FAIL,
      payload: getError(error),
    });

    return false;
  }
};

export const updateAdminTestimonial = async (dispatch, id, formData) => {
  try {
    if (!id) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Invalid testimonial id.",
      });

      return false;
    }

    const payload = {
      name: String(formData?.name || "").trim(),
      message: String(formData?.message || "").trim(),
      rating: Math.max(1, Math.min(5, Number(formData?.rating || 5))),
      imageUrl: String(formData?.imageUrl || formData?.image || "").trim(),
    };

    if (!payload.name || payload.name.length < 2) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Name must be at least 2 characters.",
      });

      return false;
    }

    if (!payload.message || payload.message.length < 3) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Message must be at least 3 characters.",
      });

      return false;
    }

    if (payload.message.length > 1200) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Message must be at most 1200 characters.",
      });

      return false;
    }

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_REQUEST });

    const { data } = await axiosInstance.put(`/testimonials/${id}`, payload);

    dispatch({
      type: UPDATE_TESTIMONIAL_SUCCESS,
      payload: normalizeTestimonials([data?.testimonial || data])[0],
    });

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_FINISH });

    return true;
  } catch (error) {
    dispatch({
      type: MANAGE_TESTIMONIAL_FAIL,
      payload: getError(error),
    });

    return false;
  }
};

export const approveAdminTestimonial = async (dispatch, id, approved) => {
  try {
    if (!id) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Invalid testimonial id.",
      });

      return false;
    }

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_REQUEST });

    const { data } = await axiosInstance.patch(`/testimonials/${id}/approve`, {
      approved: Boolean(approved),
    });

    dispatch({
      type: UPDATE_TESTIMONIAL_SUCCESS,
      payload: normalizeTestimonials([data?.testimonial || data])[0],
    });

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_FINISH });

    return true;
  } catch (error) {
    dispatch({
      type: MANAGE_TESTIMONIAL_FAIL,
      payload: getError(error),
    });

    return false;
  }
};

export const deleteAdminTestimonial = async (dispatch, id) => {
  try {
    if (!id) {
      dispatch({
        type: MANAGE_TESTIMONIAL_FAIL,
        payload: "Invalid testimonial id.",
      });

      return false;
    }

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_REQUEST });

    await axiosInstance.delete(`/testimonials/${id}`);

    dispatch({
      type: DELETE_TESTIMONIAL_SUCCESS,
      payload: id,
    });

    dispatch({ type: MANAGE_TESTIMONIAL_ACTION_FINISH });

    return true;
  } catch (error) {
    dispatch({
      type: MANAGE_TESTIMONIAL_FAIL,
      payload: getError(error),
    });

    return false;
  }
};
