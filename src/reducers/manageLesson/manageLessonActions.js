// src/reducers/manageLesson/manageLessonActions.js
import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_LESSON_ACTIONS } from "./manageLessonActionTypes";

const BASE_URL = "/lessons";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const extractLessons = (data) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.lessons)) return data.lessons;
  if (Array.isArray(data)) return data;
  return [];
};

const extractLesson = (data) => {
  return data?.data || data?.lesson || null;
};

const normalizeLessonPayload = (formData = {}) => ({
  course: formData.course || formData.courseId || "",
  title: String(formData.title || "").trim(),
  description: String(formData.description || "").trim(),
  videoUrl: String(formData.videoUrl || "").trim(),
  durationInMinutes: Math.max(0, Number(formData.durationInMinutes) || 0),
  order: Math.max(0, Number(formData.order) || 0),
  isPreview: Boolean(formData.isPreview),
  isPublished: formData.isPublished !== false,
  resources: Array.isArray(formData.resources)
    ? formData.resources
        .map((resource) => ({
          label: String(resource?.label || "").trim(),
          url: String(resource?.url || "").trim(),
        }))
        .filter((resource) => resource.label || resource.url)
    : [],
});

export const fetchManageLessons = () => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.LESSONS_REQUEST });

    const { data } = await axiosInstance.get(BASE_URL);

    dispatch({
      type: MANAGE_LESSON_ACTIONS.LESSONS_SUCCESS,
      payload: extractLessons(data),
    });

    return { success: true, lessons: extractLessons(data) };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch lessons.");

    dispatch({
      type: MANAGE_LESSON_ACTIONS.LESSONS_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const createManageLesson = (formData) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.CREATE_LESSON_REQUEST });

    const payload = normalizeLessonPayload(formData);

    const { data } = await axiosInstance.post(BASE_URL, payload);

    const lesson = extractLesson(data);

    if (!lesson?._id) {
      throw new Error(
        "Lesson was created, but the server response was invalid.",
      );
    }

    dispatch({
      type: MANAGE_LESSON_ACTIONS.CREATE_LESSON_SUCCESS,
      payload: lesson,
    });

    return { success: true, lesson };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create lesson.");

    dispatch({
      type: MANAGE_LESSON_ACTIONS.CREATE_LESSON_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const updateManageLesson = (lessonId, formData) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.UPDATE_LESSON_REQUEST });

    if (!lessonId) {
      throw new Error("Lesson ID is required.");
    }

    const payload = normalizeLessonPayload(formData);

    const { data } = await axiosInstance.put(
      `${BASE_URL}/${lessonId}`,
      payload,
    );

    const lesson = extractLesson(data);

    if (!lesson?._id) {
      throw new Error(
        "Lesson was updated, but the server response was invalid.",
      );
    }

    dispatch({
      type: MANAGE_LESSON_ACTIONS.UPDATE_LESSON_SUCCESS,
      payload: lesson,
    });

    return { success: true, lesson };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update lesson.");

    dispatch({
      type: MANAGE_LESSON_ACTIONS.UPDATE_LESSON_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const deleteManageLesson = (lessonId) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.DELETE_LESSON_REQUEST });

    if (!lessonId) {
      throw new Error("Lesson ID is required.");
    }

    await axiosInstance.delete(`${BASE_URL}/${lessonId}`);

    dispatch({
      type: MANAGE_LESSON_ACTIONS.DELETE_LESSON_SUCCESS,
      payload: lessonId,
    });

    return { success: true };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete lesson.");

    dispatch({
      type: MANAGE_LESSON_ACTIONS.DELETE_LESSON_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const clearManageLessonMessages = () => ({
  type: MANAGE_LESSON_ACTIONS.CLEAR_LESSON_MESSAGES,
});

export const resetManageLessonState = () => ({
  type: MANAGE_LESSON_ACTIONS.RESET_LESSON_STATE,
});
