// src/admin/reducers/manageCourses/manageCoursesActions.js

import api from "../../lib/apiClient";
import { MANAGE_COURSES_ACTIONS } from "./manageCoursesActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeCoursePayload = (formData) => {
  const toArray = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeLevel = (value) => {
    const level = String(value || "beginner").toLowerCase().trim();
    if (level === "advanced") return "advance";
    return level;
  };

  const level = normalizeLevel(formData.level);
  const requiredMembershipLevel = normalizeLevel(
    formData.requiredMembershipLevel || level
  );

  return {
    title: String(formData.title || "").trim(),
    description: String(formData.description || "").trim(),
    category: formData.category || "Boxing Fundamentals",
    focusArea: String(formData.focusArea || "").trim(),

    level,
    requiredMembershipLevel: formData.isFree ? "none" : requiredMembershipLevel,

    allowSinglePurchase: Boolean(formData.allowSinglePurchase),
    stripePriceId: String(formData.stripePriceId || "").trim(),

    thumbnail: String(formData.thumbnail || "").trim(),
    promoVideo: String(formData.promoVideo || "").trim(),

    price: formData.price === "" ? 0 : Number(formData.price),
    salePrice: formData.salePrice === "" ? null : Number(formData.salePrice),

    isFree: Boolean(formData.isFree),

    durationInMinutes:
      formData.durationInMinutes === "" ? 0 : Number(formData.durationInMinutes),

    totalLessons:
      formData.totalLessons === "" ? 0 : Number(formData.totalLessons),

    language: String(formData.language || "English").trim(),

    equipmentNeeded: toArray(formData.equipmentNeeded),
    requirements: toArray(formData.requirements),
    whatYouWillLearn: toArray(formData.whatYouWillLearn),
    tags: toArray(formData.tags).map((tag) => tag.toLowerCase()),

    isFeatured: Boolean(formData.isFeatured),
    isPublished: Boolean(formData.isPublished),
  };
};

const parseCoursesResponse = (res) => {
  const payload = res?.data || {};

  const courses = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.courses)
    ? payload.courses
    : Array.isArray(payload)
    ? payload
    : [];

  return {
    courses,
    meta: {
      total: payload.total ?? courses.length,
      page: payload.page ?? 1,
      pages: payload.pages ?? 1,
    },
  };
};

export const fetchManageCourses = () => async (dispatch) => {
  dispatch({ type: MANAGE_COURSES_ACTIONS.FETCH_START });

  try {
    const res = await api.get("/courses");
    const parsed = parseCoursesResponse(res);

    dispatch({
      type: MANAGE_COURSES_ACTIONS.FETCH_SUCCESS,
      payload: parsed,
    });
  } catch (error) {
    dispatch({
      type: MANAGE_COURSES_ACTIONS.FETCH_FAIL,
      payload: getErrorMessage(error, "Failed to load courses."),
    });
  }
};

export const createManageCourse = (formData) => async (dispatch) => {
  dispatch({ type: MANAGE_COURSES_ACTIONS.SAVE_START });

  try {
    const payload = normalizeCoursePayload(formData);

    if (!payload.title || !payload.description) {
      throw new Error("Title and description are required.");
    }

    const res = await api.post("/courses", payload);
    const course = res?.data?.data || res?.data?.course || res?.data;

    dispatch({
      type: MANAGE_COURSES_ACTIONS.CREATE_SUCCESS,
      payload: {
        course,
        message: res?.data?.message || "Course created successfully.",
      },
    });

    return course;
  } catch (error) {
    dispatch({
      type: MANAGE_COURSES_ACTIONS.SAVE_FAIL,
      payload: getErrorMessage(error, "Failed to create course."),
    });

    throw error;
  }
};

export const updateManageCourse = (id, formData) => async (dispatch) => {
  dispatch({ type: MANAGE_COURSES_ACTIONS.SAVE_START });

  try {
    const payload = normalizeCoursePayload(formData);

    if (!payload.title || !payload.description) {
      throw new Error("Title and description are required.");
    }

    const res = await api.put(`/courses/${id}`, payload);
    const course = res?.data?.data || res?.data?.course || res?.data;

    dispatch({
      type: MANAGE_COURSES_ACTIONS.UPDATE_SUCCESS,
      payload: {
        course,
        message: res?.data?.message || "Course updated successfully.",
      },
    });

    return course;
  } catch (error) {
    dispatch({
      type: MANAGE_COURSES_ACTIONS.SAVE_FAIL,
      payload: getErrorMessage(error, "Failed to update course."),
    });

    throw error;
  }
};

export const deleteManageCourse = (id) => async (dispatch) => {
  dispatch({ type: MANAGE_COURSES_ACTIONS.DELETE_START });

  try {
    const res = await api.delete(`/courses/${id}`);

    dispatch({
      type: MANAGE_COURSES_ACTIONS.DELETE_SUCCESS,
      payload: {
        id,
        message: res?.data?.message || "Course deleted successfully.",
      },
    });
  } catch (error) {
    dispatch({
      type: MANAGE_COURSES_ACTIONS.DELETE_FAIL,
      payload: getErrorMessage(error, "Failed to delete course."),
    });

    throw error;
  }
};