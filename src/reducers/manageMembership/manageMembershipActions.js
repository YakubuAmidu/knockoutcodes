import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_MEMBERSHIPS_ACTIONS } from "./manageMembershipActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchManageMemberships =
  ({ keyword = "", page = 1, limit = 100, sort = "" } = {}) =>
  async (dispatch) => {
    try {
      dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.FETCH_REQUEST });

      const params = new URLSearchParams();

      if (keyword) params.set("keyword", keyword);
      if (sort) params.set("sort", sort);

      params.set("page", String(page));
      params.set("limit", String(limit));

      const { data } = await axiosInstance.get(
        `/memberships?${params.toString()}`,
      );

      dispatch({
        type: MANAGE_MEMBERSHIPS_ACTIONS.FETCH_SUCCESS,
        payload: {
          data: data?.data || [],
          pagination: data?.pagination,
        },
      });

      return { success: true, data };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch memberships.");

      dispatch({
        type: MANAGE_MEMBERSHIPS_ACTIONS.FETCH_FAIL,
        payload: message,
      });

      return { success: false, message };
    }
  };

export const createManageMembership = (payload) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post("/memberships", payload);

    dispatch({
      type: MANAGE_MEMBERSHIPS_ACTIONS.CREATE_SUCCESS,
      payload: data?.data,
    });

    return { success: true, data: data?.data };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create membership.");

    dispatch({
      type: MANAGE_MEMBERSHIPS_ACTIONS.CREATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const updateManageMembership =
  (membershipId, payload) => async (dispatch) => {
    try {
      dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_REQUEST });

      const { data } = await axiosInstance.put(
        `/memberships/${encodeURIComponent(membershipId)}`,
        payload,
      );

      dispatch({
        type: MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_SUCCESS,
        payload: data?.data,
      });

      return { success: true, data: data?.data };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update membership.");

      dispatch({
        type: MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_FAIL,
        payload: message,
      });

      return { success: false, message };
    }
  };

export const deleteManageMembership = (membershipId) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(
      `/memberships/${encodeURIComponent(membershipId)}`,
    );

    dispatch({
      type: MANAGE_MEMBERSHIPS_ACTIONS.DELETE_SUCCESS,
      payload: membershipId,
    });

    return { success: true };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete membership.");

    dispatch({
      type: MANAGE_MEMBERSHIPS_ACTIONS.DELETE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};
