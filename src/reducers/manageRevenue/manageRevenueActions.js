import axiosInstance from "../../../utils/axiosInstance";
import { MANAGE_REVENUE_ACTIONS } from "./manageRevenueActionTypes";

const ADMIN_REVENUE_URL = "/admin/revenue";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchManageRevenue = () => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_REVENUE_ACTIONS.FETCH_START });

    const { data } = await axiosInstance.get(ADMIN_REVENUE_URL);

    const payload = data?.data || data || {};

    dispatch({
      type: MANAGE_REVENUE_ACTIONS.FETCH_SUCCESS,
      payload: {
        revenues: payload.revenues || payload.orders || [],
        summary: payload.summary || {},
      },
    });
  } catch (error) {
    dispatch({
      type: MANAGE_REVENUE_ACTIONS.FETCH_FAILURE,
      payload: getErrorMessage(error, "Failed to fetch revenue."),
    });
  }
};

export const setSelectedRevenue = (revenue) => ({
  type: MANAGE_REVENUE_ACTIONS.SET_SELECTED,
  payload: revenue,
});

export const clearSelectedRevenue = () => ({
  type: MANAGE_REVENUE_ACTIONS.CLEAR_SELECTED,
});

export const updateRevenueField = (name, value) => ({
  type: MANAGE_REVENUE_ACTIONS.UPDATE_FIELD,
  payload: { name, value },
});

export const updateManageRevenue = (id, payload) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_REVENUE_ACTIONS.UPDATE_START });

    const { data } = await axiosInstance.patch(`${ADMIN_REVENUE_URL}/${id}`, payload);

    const updated = data?.data || data?.revenue || data?.order || data;

    dispatch({
      type: MANAGE_REVENUE_ACTIONS.UPDATE_SUCCESS,
      payload: updated,
    });

    return updated;
  } catch (error) {
    dispatch({
      type: MANAGE_REVENUE_ACTIONS.UPDATE_FAILURE,
      payload: getErrorMessage(error, "Failed to update revenue."),
    });

    return null;
  }
};

export const deleteManageRevenue = (id) => async (dispatch) => {
  try {
    dispatch({ type: MANAGE_REVENUE_ACTIONS.DELETE_START });

    await axiosInstance.delete(`${ADMIN_REVENUE_URL}/${id}`);

    dispatch({
      type: MANAGE_REVENUE_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });

    return true;
  } catch (error) {
    dispatch({
      type: MANAGE_REVENUE_ACTIONS.DELETE_FAILURE,
      payload: getErrorMessage(error, "Failed to delete revenue."),
    });

    return false;
  }
};

export const setManageRevenueSearch = (value) => ({
  type: MANAGE_REVENUE_ACTIONS.SET_SEARCH,
  payload: value,
});

export const setManageRevenueFilter = (value) => ({
  type: MANAGE_REVENUE_ACTIONS.SET_FILTER,
  payload: value,
});

export const resetManageRevenueError = () => ({
  type: MANAGE_REVENUE_ACTIONS.RESET_ERROR,
});