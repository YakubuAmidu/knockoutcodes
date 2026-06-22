import axiosInstance from "../../../utils/axiosInstance";
import * as types from "./courseActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeCourses = (data) => {
  if (Array.isArray(data?.data?.courses)) return data.data.courses;
  if (Array.isArray(data?.courses)) return data.courses;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeCourse = (data) =>
  data?.data?.course || data?.course || data?.data || null;

/* =========================
   Fetch all published courses
========================= */
export const fetchCourses = () => async (dispatch) => {
  try {
    dispatch({ type: types.COURSE_REQUEST });

    const res = await axiosInstance.get("/courses", {
      params: { published: true },
    });

    dispatch({
      type: types.COURSES_SUCCESS,
      payload: normalizeCourses(res.data),
    });

    return { ok: true, courses: normalizeCourses(res.data) };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load courses");

    dispatch({
      type: types.COURSE_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   Fetch single course
========================= */
export const fetchCourseDetail = (id) => async (dispatch) => {
  try {
    if (!id) throw new Error("Course ID is required.");

    dispatch({ type: types.COURSE_DETAIL_REQUEST });

    const res = await axiosInstance.get(`/courses/${encodeURIComponent(id)}`);

    const course = normalizeCourse(res.data);

    dispatch({
      type: types.COURSE_DETAIL_SUCCESS,
      payload: course,
    });

    return { ok: true, course };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load course");

    dispatch({
      type: types.COURSE_DETAIL_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   Create Stripe checkout session
========================= */
export const createCourseCheckout =
  (courseId, billingPlan = "one_time") =>
  async (dispatch) => {
    try {
      if (!courseId) throw new Error("Course ID is required.");

      dispatch({ type: types.COURSE_CHECKOUT_REQUEST });

      const res = await axiosInstance.post("/checkout/courses", {
        courseId,
        billingPlan,
      });

      const url =
        res.data?.url ||
        res.data?.checkoutUrl ||
        res.data?.data?.url ||
        res.data?.data?.checkoutUrl ||
        "";

      if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        throw new Error("Checkout did not return a valid URL.");
      }

      dispatch({
        type: types.COURSE_CHECKOUT_SUCCESS,
        payload: url,
      });

      window.location.href = url;

      return { ok: true, url };
    } catch (error) {
      const data = error?.response?.data;

      if (error?.response?.status === 409 && data?.alreadyPurchased) {
        const payload = {
          courseId: data.courseId || courseId,
          enrollmentId: data.enrollmentId || null,
          message:
            data.message ||
            "You already purchased this course. Open it from My Courses.",
        };

        dispatch({
          type: types.COURSE_ALREADY_PURCHASED,
          payload,
        });

        return { ok: false, alreadyPurchased: true, ...payload };
      }

      if (error?.response?.status === 409 && data?.alreadyAccessible) {
        const payload = {
          courseId: data.courseId || courseId,
          message:
            data.message ||
            "This course is already included in your active membership.",
        };

        dispatch({
          type: types.COURSE_ALREADY_PURCHASED,
          payload,
        });

        return { ok: false, alreadyAccessible: true, ...payload };
      }

      if (error?.response?.status === 403 && data?.membershipRequired) {
        const message =
          data.message || "This course is only available through membership.";

        dispatch({
          type: types.COURSE_CHECKOUT_FAIL,
          payload: message,
        });

        return {
          ok: false,
          membershipRequired: true,
          requiredMembershipLevel: data.requiredMembershipLevel || null,
          message,
        };
      }

      const message = getErrorMessage(
        error,
        "Unable to start checkout. Try again.",
      );

      dispatch({
        type: types.COURSE_CHECKOUT_FAIL,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Reset checkout/status state
========================= */
export const resetCourseState = () => ({
  type: types.COURSE_RESET,
});
