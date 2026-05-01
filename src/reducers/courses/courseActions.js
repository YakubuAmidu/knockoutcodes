import axiosInstance from "../../../utils/axiosInstance";
import * as types from "./courseActionTypes";

/* =========================
   Fetch all courses
========================= */
export const fetchCourses = () => async (dispatch) => {
  try {
    dispatch({ type: types.COURSE_REQUEST });

    const res = await axiosInstance.get("/courses?published=true");

    dispatch({
      type: types.COURSES_SUCCESS,
      payload: res.data?.data || [],
    });
  } catch (error) {
    dispatch({
      type: types.COURSE_FAIL,
      payload: error?.response?.data?.message || "Failed to load courses",
    });
  }
};

/* =========================
   Fetch single course
========================= */
export const fetchCourseDetail = (id) => async (dispatch) => {
  try {
    dispatch({ type: types.COURSE_REQUEST });

    const res = await axiosInstance.get(`/courses/${id}`);

    // ✅ make this match your backend response shape:
    // if backend returns { data: course } use res.data?.data
    // if backend returns { course: course } use res.data?.course
    dispatch({
      type: types.COURSE_DETAIL_SUCCESS,
      payload: res.data?.data || res.data?.course || null,
    });
  } catch (error) {
    dispatch({
      type: types.COURSE_FAIL,
      payload: error?.response?.data?.message || "Failed to load course",
    });
  }
};

/* =========================
   Create Stripe checkout session (COURSE)
========================= */
export const createCourseCheckout =
  (courseId, billingPlan = "one_time") =>
  async (dispatch) => {
    try {
      dispatch({ type: types.COURSE_CHECKOUT_REQUEST });

      const res = await axiosInstance.post("/checkout/courses", {
        courseId,
        billingPlan, // ✅ keep consistent everywhere
      });

      const url = res.data?.url;

      if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        throw new Error("Checkout did not return a valid URL.");
      }

      dispatch({
        type: types.COURSE_CHECKOUT_SUCCESS,
        payload: url,
      });
    } catch (error) {
      dispatch({
        type: types.COURSE_CHECKOUT_FAIL,
        payload:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to start checkout. Try again.",
      });
    }
  };

/* =========================
   Reset
========================= */
export const resetCourseState = () => ({ type: types.COURSE_RESET });
