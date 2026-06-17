import * as types from "./manageUserActionTypes";
import { manageUserInitialState } from "./manageUserInitialState";

function buildAnalytics(users = []) {
  const safeUsers = Array.isArray(users) ? users : [];

  return {
    total: safeUsers.length,

    active: safeUsers.filter(
      (u) => u.accountStatus === "active" && !u.isDeleted,
    ).length,

    suspended: safeUsers.filter(
      (u) => u.accountStatus === "suspended" && !u.isDeleted,
    ).length,

    onHold: safeUsers.filter(
      (u) => u.accountStatus === "on_hold" && !u.isDeleted,
    ).length,

    banned: safeUsers.filter(
      (u) => u.accountStatus === "banned" && !u.isDeleted,
    ).length,

    deactivated: safeUsers.filter(
      (u) => u.accountStatus === "deactivated" && !u.isDeleted,
    ).length,

    admins: safeUsers.filter(
      (u) => String(u.role || "").toLowerCase() === "admin",
    ).length,

    verifiedUsers: safeUsers.filter((u) => u.isEmailVerified === true).length,

    unverifiedUsers: safeUsers.filter((u) => u.isEmailVerified !== true).length,

    deleted: safeUsers.filter((u) => u.isDeleted === true).length,
  };
}

function getUserId(user) {
  return user?._id || user?.id || null;
}

function replaceUser(users = [], updatedUser) {
  const safeUsers = Array.isArray(users) ? users : [];
  const updatedId = getUserId(updatedUser);

  if (!updatedId) return safeUsers;

  const exists = safeUsers.some(
    (user) => String(getUserId(user)) === String(updatedId),
  );

  if (!exists) return [updatedUser, ...safeUsers];

  return safeUsers.map((user) =>
    String(getUserId(user)) === String(updatedId) ? updatedUser : user,
  );
}

export function manageUserReducer(state = manageUserInitialState, action) {
  switch (action.type) {
    case types.MANAGE_USERS_FETCH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.MANAGE_USERS_FETCH_SUCCESS: {
      const users = Array.isArray(action.payload) ? action.payload : [];

      return {
        ...state,
        loading: false,
        users,
        analytics: buildAnalytics(users),
        error: null,
      };
    }

    case types.MANAGE_USERS_FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case types.MANAGE_USER_FETCH_START:
      return {
        ...state,
        loadingUser: true,
        error: null,
      };

    case types.MANAGE_USER_FETCH_SUCCESS:
      return {
        ...state,
        loadingUser: false,
        selectedUser: action.payload,
        error: null,
      };

    case types.MANAGE_USER_FETCH_FAIL:
      return {
        ...state,
        loadingUser: false,
        error: action.payload,
      };

    case types.MANAGE_USER_UPDATE_START:
      return {
        ...state,
        updating: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_UPDATE_SUCCESS: {
      const updatedUser = action.payload;
      const updatedUsers = replaceUser(state.users, updatedUser);

      return {
        ...state,
        updating: false,
        users: updatedUsers,
        selectedUser: updatedUser,
        analytics: buildAnalytics(updatedUsers),
        success: true,
        error: null,
      };
    }

    case types.MANAGE_USER_UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case types.MANAGE_USER_STATUS_START:
      return {
        ...state,
        changingStatus: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_STATUS_SUCCESS: {
      const updatedUser = action.payload;
      const updatedUsers = replaceUser(state.users, updatedUser);

      return {
        ...state,
        changingStatus: false,
        users: updatedUsers,
        selectedUser: updatedUser,
        analytics: buildAnalytics(updatedUsers),
        success: true,
        error: null,
      };
    }

    case types.MANAGE_USER_STATUS_FAIL:
      return {
        ...state,
        changingStatus: false,
        error: action.payload,
      };

    case types.MANAGE_USER_FORCE_LOGOUT_START:
      return {
        ...state,
        forceLoggingOut: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_FORCE_LOGOUT_SUCCESS:
      return {
        ...state,
        forceLoggingOut: false,
        success: true,
        error: null,
      };

    case types.MANAGE_USER_FORCE_LOGOUT_FAIL:
      return {
        ...state,
        forceLoggingOut: false,
        error: action.payload,
      };

    case types.MANAGE_USER_SOFT_DELETE_START:
      return {
        ...state,
        softDeleting: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_SOFT_DELETE_SUCCESS: {
      const updatedUser = action.payload;
      const updatedUsers = replaceUser(state.users, updatedUser);

      return {
        ...state,
        softDeleting: false,
        users: updatedUsers,
        selectedUser: updatedUser,
        analytics: buildAnalytics(updatedUsers),
        success: true,
        error: null,
      };
    }

    case types.MANAGE_USER_SOFT_DELETE_FAIL:
      return {
        ...state,
        softDeleting: false,
        error: action.payload,
      };

    case types.MANAGE_USER_RESTORE_START:
      return {
        ...state,
        restoring: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_RESTORE_SUCCESS: {
      const restoredUser = action.payload;
      const updatedUsers = replaceUser(state.users, restoredUser);

      return {
        ...state,
        restoring: false,
        users: updatedUsers,
        selectedUser: restoredUser,
        analytics: buildAnalytics(updatedUsers),
        success: true,
        error: null,
      };
    }

    case types.MANAGE_USER_RESTORE_FAIL:
      return {
        ...state,
        restoring: false,
        error: action.payload,
      };

    case types.MANAGE_USER_DELETE_START:
      return {
        ...state,
        deleting: true,
        success: false,
        error: null,
      };

    case types.MANAGE_USER_DELETE_SUCCESS: {
      const deletedId = action.payload;

      const updatedUsers = Array.isArray(state.users)
        ? state.users.filter(
            (user) => String(getUserId(user)) !== String(deletedId),
          )
        : [];

      return {
        ...state,
        deleting: false,
        users: updatedUsers,
        selectedUser:
          String(getUserId(state.selectedUser)) === String(deletedId)
            ? null
            : state.selectedUser,
        analytics: buildAnalytics(updatedUsers),
        success: true,
        error: null,
      };
    }

    case types.MANAGE_USER_DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case types.MANAGE_USER_CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case types.MANAGE_USER_SET_SELECTED:
      return {
        ...state,
        selectedUser: action.payload,
      };

    case types.MANAGE_USER_SET_SEARCH:
      return {
        ...state,
        search: action.payload,
      };

    case types.MANAGE_USER_SET_FILTER:
      return {
        ...state,
        filter: action.payload,
      };

    case types.MANAGE_USER_RESET:
      return manageUserInitialState;

    default:
      return state;
  }
}
