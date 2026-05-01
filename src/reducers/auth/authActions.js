import axiosInstance from "../../../utils/axiosInstance";
import { AUTH_ACTIONS } from "./authActionTypes";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchAuthUser = () => async (dispatch) => {
  try {
    dispatch({ type: AUTH_ACTIONS.AUTH_REQUEST });

    const { data } = await axiosInstance.get("/auth/me");

    const user = data?.user || data?.data?.user || data?.data || null;

    dispatch({
      type: AUTH_ACTIONS.AUTH_SUCCESS,
      payload: user,
    });

    return { ok: true, user };
  } catch (error) {
    dispatch({
      type: AUTH_ACTIONS.AUTH_FAIL,
      payload: getErrorMessage(error, "Failed to fetch auth user"),
    });

    return { ok: false };
  }
};

export const clearAuthError = () => ({
  type: AUTH_ACTIONS.AUTH_CLEAR_ERROR,
});

export const logoutAuthRedux = () => ({
  type: AUTH_ACTIONS.AUTH_LOGOUT,
});