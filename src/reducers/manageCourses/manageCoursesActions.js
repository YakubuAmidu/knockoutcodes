import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_COURSES_ACTIONS as T } from "./manageCoursesActionTypes";

const ADMIN_COURSES_ENDPOINT = "/courses/admin/manage";

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const normalizeCourses = (data) => {
  if (Array.isArray(data?.data?.courses)) return data.data.courses;
  if (Array.isArray(data?.courses)) return data.courses;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeCourse = (data) => {
  return data?.data?.course || data?.course || data?.data || null;
};

const normalizeMeta = (data) => ({
  total: data?.meta?.total ?? data?.total ?? normalizeCourses(data).length ?? 0,
  page: data?.meta?.page ?? data?.page ?? 1,
  pages: data?.meta?.pages ?? data?.pages ?? 1,
});

export const fetchManageCourses =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: T.FETCH_START });

      const res = await axiosInstance.get(ADMIN_COURSES_ENDPOINT, {
        params: {
          admin: true,
          includeUnpublished: true,
          limit: 50,
          sort: "featured",
          ...params,
        },
      });

      dispatch({
        type: T.FETCH_SUCCESS,
        payload: {
          courses: normalizeCourses(res.data),
          meta: normalizeMeta(res.data),
        },
      });

      return {
        success: true,
        courses: normalizeCourses(res.data),
        meta: normalizeMeta(res.data),
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load admin courses.");
      dispatch({ type: T.FETCH_FAIL, payload: message });
      return { success: false, message };
    }
  };

export const createManageCourse = (payload) => async (dispatch) => {
  try {
    dispatch({ type: T.SAVE_START });

    const res = await axiosInstance.post("/courses", payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const course = normalizeCourse(res.data);

    if (!course?._id) {
      throw new Error("Course was created, but the server did not return it.");
    }

    dispatch({ type: T.CREATE_SUCCESS, payload: course });

    return {
      success: true,
      course,
      message: res.data?.message || "Course created successfully.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create course.");
    dispatch({ type: T.SAVE_FAIL, payload: message });
    return { success: false, message };
  }
};

export const updateManageCourse = (courseId, payload) => async (dispatch) => {
  try {
    if (!courseId) throw new Error("Course ID is required.");

    dispatch({ type: T.SAVE_START });

    const res = await axiosInstance.put(
      `/courses/${encodeURIComponent(courseId)}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const course = normalizeCourse(res.data);

    if (!course?._id) {
      throw new Error("Course was updated, but the server did not return it.");
    }

    dispatch({ type: T.UPDATE_SUCCESS, payload: course });

    return {
      success: true,
      course,
      message: res.data?.message || "Course updated successfully.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update course.");
    dispatch({ type: T.SAVE_FAIL, payload: message });
    return { success: false, message };
  }
};

export const deleteManageCourse = (courseId) => async (dispatch) => {
  try {
    if (!courseId) throw new Error("Course ID is required.");

    dispatch({ type: T.DELETE_START });

    const res = await axiosInstance.delete(
      `/courses/${encodeURIComponent(courseId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {},
      }
    );

    dispatch({
      type: T.DELETE_SUCCESS,
      payload: res.data?.deletedId || courseId,
    });

    return {
      success: true,
      deletedId: res.data?.deletedId || courseId,
      message: res.data?.message || "Course deleted successfully.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete course.");
    dispatch({ type: T.DELETE_FAIL, payload: message });
    return { success: false, message };
  }
};