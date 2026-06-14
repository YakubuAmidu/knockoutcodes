import axiosInstance from "../../../utils/axiosInstance";
import * as types from "./manageUserActionTypes";

/* =========================
   Helpers
========================= */
function getErrorMessage(error, fallback = "Something went wrong.") {
  return error?.response?.data?.message || error?.message || fallback;
}

/* =========================
   Fetch All Users
========================= */
export const fetchManageUsers =
  ({ includeDeleted = false } = {}) =>
  async (dispatch) => {
    dispatch({ type: types.MANAGE_USERS_FETCH_START });

    try {
      const res = await axiosInstance.get("/users", {
        params: { includeDeleted },
      });

      const users = Array.isArray(res.data?.data?.users)
        ? res.data.data.users
        : [];

      dispatch({
        type: types.MANAGE_USERS_FETCH_SUCCESS,
        payload: users,
      });

      return { ok: true, users };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch users.");

      dispatch({
        type: types.MANAGE_USERS_FETCH_FAIL,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Fetch One User
========================= */
export const fetchManageUserById = (userId) => async (dispatch) => {
  dispatch({ type: types.MANAGE_USER_FETCH_START });

  try {
    const res = await axiosInstance.get(`/users/${userId}`);
    const user = res.data?.data || null;

    dispatch({
      type: types.MANAGE_USER_FETCH_SUCCESS,
      payload: user,
    });

    return { ok: true, user };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch user.");

    dispatch({
      type: types.MANAGE_USER_FETCH_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   Update User
========================= */
export const updateManageUser = (userId, payload) => async (dispatch) => {
  dispatch({ type: types.MANAGE_USER_UPDATE_START });

  try {
    const res = await axiosInstance.patch(`/users/${userId}`, payload);
    const user = res.data?.data || null;

    dispatch({
      type: types.MANAGE_USER_UPDATE_SUCCESS,
      payload: user,
    });

    return {
      ok: true,
      user,
      message: res.data?.message || "User updated.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update user.");

    dispatch({
      type: types.MANAGE_USER_UPDATE_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   Update User Status
========================= */
export const updateManageUserStatus =
  (userId, payload) => async (dispatch) => {
    dispatch({ type: types.MANAGE_USER_STATUS_START });

    try {
      const res = await axiosInstance.patch(`/users/${userId}/status`, payload);
      const user = res.data?.data || null;

      dispatch({
        type: types.MANAGE_USER_STATUS_SUCCESS,
        payload: user,
      });

      return {
        ok: true,
        user,
        message: res.data?.message || "User status updated.",
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update user status.");

      dispatch({
        type: types.MANAGE_USER_STATUS_FAIL,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Force Logout User
========================= */
export const forceLogoutManageUser = (userId) => async (dispatch) => {
  dispatch({ type: types.MANAGE_USER_FORCE_LOGOUT_START });

  try {
    const res = await axiosInstance.patch(`/users/${userId}/force-logout`, {});

    dispatch({
      type: types.MANAGE_USER_FORCE_LOGOUT_SUCCESS,
      payload: userId,
    });

    return {
      ok: true,
      message: res.data?.message || "User logged out from all devices.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to force logout user.");

    dispatch({
      type: types.MANAGE_USER_FORCE_LOGOUT_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   Soft Delete User
========================= */
export const softDeleteManageUser =
  (userId, payload = {}) =>
  async (dispatch) => {
    dispatch({ type: types.MANAGE_USER_SOFT_DELETE_START });

    try {
      const res = await axiosInstance.patch(
        `/users/${userId}/soft-delete`,
        payload
      );

      const user = res.data?.data || null;

      dispatch({
        type: types.MANAGE_USER_SOFT_DELETE_SUCCESS,
        payload: user,
      });

      dispatch(fetchManageUsers({ includeDeleted: true }));

      return {
        ok: true,
        user,
        message: res.data?.message || "User account archived.",
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to archive user.");

      dispatch({
        type: types.MANAGE_USER_SOFT_DELETE_FAIL,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Restore User
========================= */
export const restoreManageUser =
  (userId, payload = {}) =>
  async (dispatch) => {
    dispatch({ type: types.MANAGE_USER_RESTORE_START });

    try {
      const res = await axiosInstance.patch(`/users/${userId}/restore`, payload);
      const user = res.data?.data || null;

      dispatch({
        type: types.MANAGE_USER_RESTORE_SUCCESS,
        payload: user,
      });

      dispatch(fetchManageUsers({ includeDeleted: true }));

      return {
        ok: true,
        user,
        message: res.data?.message || "User restored successfully.",
      };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to restore user.");

      dispatch({
        type: types.MANAGE_USER_RESTORE_FAIL,
        payload: message,
      });

      return { ok: false, message };
    }
  };

/* =========================
   Hard Delete User
========================= */
export const deleteManageUser = (userId) => async (dispatch) => {
  dispatch({ type: types.MANAGE_USER_DELETE_START });

  try {
    const res = await axiosInstance.delete(`/users/${userId}`, {
      data: {},
      headers: {
        "Content-Type": "application/json",
      },
    });

    const deletedId = res.data?.data?.id || userId;

    dispatch({
      type: types.MANAGE_USER_DELETE_SUCCESS,
      payload: deletedId,
    });

    return {
      ok: true,
      id: deletedId,
      message: res.data?.message || "User deleted.",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete user.");

    dispatch({
      type: types.MANAGE_USER_DELETE_FAIL,
      payload: message,
    });

    return { ok: false, message };
  }
};

/* =========================
   UI Actions
========================= */
export const setSelectedManageUser = (user) => ({
  type: types.MANAGE_USER_SET_SELECTED,
  payload: user,
});

export const setManageUserSearch = (value) => ({
  type: types.MANAGE_USER_SET_SEARCH,
  payload: value,
});

export const setManageUserFilter = (value) => ({
  type: types.MANAGE_USER_SET_FILTER,
  payload: value,
});

export const clearManageUserError = () => ({
  type: types.MANAGE_USER_CLEAR_ERROR,
});

export const resetManageUsers = () => ({
  type: types.MANAGE_USER_RESET,
});