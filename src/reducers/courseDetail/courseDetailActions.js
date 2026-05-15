// src/reducers/courseDetail/courseDetailActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { COURSE_DETAIL_ACTIONS } from "./courseDetailActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchCourseDetail = (courseId) => async (dispatch) => {
  try {
    dispatch({ type: COURSE_DETAIL_ACTIONS.COURSE_DETAIL_REQUEST });

    const { data } = await axiosInstance.get(`/courses/${courseId}`);

    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_DETAIL_SUCCESS,
      payload: data?.course || data?.data,
    });
  } catch (error) {
    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_DETAIL_FAIL,
      payload: getErrorMessage(error, "Failed to load course."),
    });
  }
};

export const checkCourseAccess = (courseId) => async (dispatch) => {
  try {
    dispatch({ type: COURSE_DETAIL_ACTIONS.COURSE_ACCESS_REQUEST });

    const { data } = await axiosInstance.get(`/enrollments/access/${courseId}`);

    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_ACCESS_SUCCESS,
      payload: {
        hasAccess: data?.hasAccess,
        accessType: data?.accessType,
      },
    });
  } catch (error) {
    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_ACCESS_FAIL,
      payload: getErrorMessage(error, "You do not have access yet."),
    });
  }
};

export const startCourseCheckout = (courseId) => async (dispatch) => {
  try {
    dispatch({ type: COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_REQUEST });

    const { data } = await axiosInstance.post("/checkout/course", {
      courseId,
    });

    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_SUCCESS,
      payload: data?.url,
    });

    if (data?.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    dispatch({
      type: COURSE_DETAIL_ACTIONS.COURSE_CHECKOUT_FAIL,
      payload: getErrorMessage(error, "Failed to start checkout."),
    });
  }
};