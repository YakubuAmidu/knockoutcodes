// src/redux/user/userActions.js
import * as T from "./userActionTypes";

// ---- profile fetch ----
export const userMeRequest = () => ({ type: T.USER_ME_REQUEST });
export const userMeSuccess = (user) => ({
  type: T.USER_ME_SUCCESS,
  payload: user,
});
export const userMeFail = (message) => ({
  type: T.USER_ME_FAIL,
  payload: message,
});

// ---- edit mode ----
export const setUserEditMode = (isOn) => ({
  type: T.USER_ME_SET_EDIT_MODE,
  payload: !!isOn,
});

// ---- form ----
export const updateUserForm = (patch) => ({
  type: T.USER_ME_FORM_UPDATE,
  payload: patch,
});

export const resetUserForm = (fullForm) => ({
  type: T.USER_ME_FORM_RESET,
  payload: fullForm,
});

// ---- save profile ----
export const userSaveRequest = () => ({ type: T.USER_ME_SAVE_REQUEST });
export const userSaveSuccess = (user) => ({
  type: T.USER_ME_SAVE_SUCCESS,
  payload: user,
});
export const userSaveFail = (message) => ({
  type: T.USER_ME_SAVE_FAIL,
  payload: message,
});

// ---- avatar ----
export const setAvatarFile = ({ file, preview }) => ({
  type: T.USER_AVATAR_SET_FILE,
  payload: { file, preview },
});

export const clearAvatar = () => ({ type: T.USER_AVATAR_CLEAR });

// ---- password ----
export const togglePasswordPanel = () => ({
  type: T.USER_PASSWORD_PANEL_TOGGLE,
});

export const updatePasswordField = (patch) => ({
  type: T.USER_PASSWORD_UPDATE_FIELD,
  payload: patch,
});

export const resetPassword = () => ({ type: T.USER_PASSWORD_RESET });

// ---- logout ----
export const userLogout = () => ({ type: T.USER_LOGOUT });
