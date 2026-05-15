import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_LESSON_ACTIONS } from "./manageLessonActionTypes";

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

export const fetchManageLessons = () => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.LESSONS_REQUEST });

    const res = await axiosInstance.get("/lessons");

    dispatch({
      type: MANAGE_LESSON_ACTIONS.LESSONS_SUCCESS,
      payload: extractLessons(res.data),
    });
  } catch (error) {
    dispatch({
      type: MANAGE_LESSON_ACTIONS.LESSONS_FAIL,
      payload: getErrorMessage(error, "Failed to fetch lessons."),
    });
  }
};

export const createManageLesson = (formData) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_LESSON_ACTIONS.CREATE_LESSON_REQUEST });

    const res = await axiosInstance.post("/lessons", formData);

    const lesson = extractLesson(res.data);

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

    const res = await axiosInstance.put(`/lessons/${lessonId}`, formData);

    const lesson = extractLesson(res.data);

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

    await axiosInstance.delete(`/lessons/${lessonId}`);

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