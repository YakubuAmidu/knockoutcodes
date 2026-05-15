// src/reducers/resetPassword/resetPasswordActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { RESET_PASSWORD_ACTIONS } from "./resetPasswordActionTypes";

function validatePassword(password = "") {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include one number.";
  return "";
}

export async function submitResetPassword(dispatch, token, payload) {
  const password = String(payload?.password || "");
  const confirmPassword = String(payload?.confirmPassword || "");

  if (!token) {
    dispatch({
      type: RESET_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: "Reset token is missing or invalid.",
    });
    return { ok: false };
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    dispatch({
      type: RESET_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: passwordError,
    });
    return { ok: false };
  }

  if (password !== confirmPassword) {
    dispatch({
      type: RESET_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: "Passwords do not match.",
    });
    return { ok: false };
  }

  dispatch({ type: RESET_PASSWORD_ACTIONS.REQUEST_START });

  try {
    const { data } = await axiosInstance.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });

    dispatch({
      type: RESET_PASSWORD_ACTIONS.REQUEST_SUCCESS,
      payload: data?.message || "Password reset successful. You can now login.",
    });

    return { ok: true, data };
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Reset link is invalid, expired, or already used.";

    dispatch({
      type: RESET_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: message,
    });

    return { ok: false, error: message };
  }
}

export function clearResetPassword(dispatch) {
  dispatch({ type: RESET_PASSWORD_ACTIONS.RESET });
}