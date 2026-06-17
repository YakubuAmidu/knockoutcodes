import axiosInstance from "../../../utils/axiosInstance";
import { MY_COURSES_ACTIONS } from "./myCoursesActionTypes";

export const fetchMyCourses = () => async (dispatch) => {
  try {
    dispatch({ type: MY_COURSES_ACTIONS.FETCH_MY_COURSES_REQUEST });

    const res = await axiosInstance.get("/enrollments/my");

    const payload = res.data || {};

    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.enrollments)
        ? payload.enrollments
        : [];

    dispatch({
      type: MY_COURSES_ACTIONS.FETCH_MY_COURSES_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: MY_COURSES_ACTIONS.FETCH_MY_COURSES_FAIL,
      payload:
        error.response?.data?.message ||
        "Failed to load your courses. Please try again.",
    });
  }
};

export const resetMyCourses = () => ({
  type: MY_COURSES_ACTIONS.RESET_MY_COURSES,
});
