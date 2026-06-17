// src/reducers/myCourseDetail/myCourseDetailActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { MY_COURSE_DETAIL_ACTIONS } from "./myCourseDetailActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const extractEnrollments = (data) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.enrollments)) return data.enrollments;
  if (Array.isArray(data)) return data;
  return [];
};

const extractLessons = (data) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.lessons)) return data.lessons;
  if (Array.isArray(data)) return data;
  return [];
};

export const fetchMyCourseDetail = (courseId) => async (dispatch) => {
  try {
    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_REQUEST,
    });

    const res = await axiosInstance.get("/enrollments/my");
    const enrollments = extractEnrollments(res.data);

    const enrollment = enrollments.find(
      (item) =>
        String(item?.course?._id) === String(courseId) ||
        String(item?.course) === String(courseId),
    );

    if (!enrollment) {
      dispatch({
        type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_FAIL,
        payload: "This course was not found in your learning library.",
      });

      return {
        success: false,
        message: "This course was not found in your learning library.",
      };
    }

    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_SUCCESS,
      payload: {
        enrollment,
        course: enrollment.course || null,
      },
    });

    return {
      success: true,
      enrollment,
      course: enrollment.course || null,
    };
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Failed to load your course details.",
    );

    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_FAIL,
      payload: message,
    });

    return {
      success: false,
      message,
    };
  }
};

export const fetchMyCourseLessons = (courseId) => async (dispatch) => {
  try {
    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_REQUEST,
    });

    const res = await axiosInstance.get(`/lessons/by-course/${courseId}`);

    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_SUCCESS,
      payload: extractLessons(res.data),
    });

    return {
      success: true,
      lessons: extractLessons(res.data),
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load course lessons.");

    dispatch({
      type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_LESSONS_FAIL,
      payload: message,
    });

    return {
      success: false,
      message,
    };
  }
};

export const resetMyCourseDetail = () => ({
  type: MY_COURSE_DETAIL_ACTIONS.MY_COURSE_DETAIL_RESET,
});
