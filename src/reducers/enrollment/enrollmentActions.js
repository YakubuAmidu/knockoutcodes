import axiosInstance from "../../../utils/axiosInstance";
import * as T from "./enrollmentActionTypes";

// ✅ Fetch "My Purchased Courses"
export const fetchMyEnrollments = () => async (dispatch) => {
  try {
    dispatch({ type: T.ENROLLMENT_FETCH_MY_REQUEST });

    const { data } = await axiosInstance.get("/enrollments/my", {
      withCredentials: true,
    });

    dispatch({
      type: T.ENROLLMENT_FETCH_MY_SUCCESS,
      payload: data?.data || [],
    });
  } catch (error) {
    dispatch({
      type: T.ENROLLMENT_FETCH_MY_FAIL,
      payload:
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch enrollments",
    });
  }
};

export const clearEnrollmentErrorAction = () => (dispatch) => {
  dispatch({ type: T.ENROLLMENT_CLEAR_ERROR });
};
