import axiosInstance from "../../../utils/axiosInstance";
import {
  ADMIN_STATS_REQUEST,
  ADMIN_STATS_SUCCESS,
  ADMIN_STATS_FAIL,
  ADMIN_STATS_RESET,
} from "./adminStatsActionTypes";

export const fetchAdminStats = () => async (dispatch) => {
  try {
    dispatch({ type: ADMIN_STATS_REQUEST });

    const res = await axiosInstance.get("/admin/stats", {
      withCredentials: true,
    });

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Failed to fetch admin stats");
    }

    dispatch({
      type: ADMIN_STATS_SUCCESS,
      payload: res.data.data,
    });
  } catch (error) {
    dispatch({
      type: ADMIN_STATS_FAIL,
      payload:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch admin stats",
    });
  }
};

export const resetAdminStats = () => ({
  type: ADMIN_STATS_RESET,
});
