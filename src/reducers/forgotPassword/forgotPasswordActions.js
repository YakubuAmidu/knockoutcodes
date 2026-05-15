// src/reducers/forgotPassword/forgotPasswordActions.js

import axiosInstance from "../../../utils/axiosInstance";
import { FORGOT_PASSWORD_ACTIONS } from "./forgotPasswordActionTypes";

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitForgotPassword(dispatch, email) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    dispatch({
      type: FORGOT_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: "Please enter your email address.",
    });
    return { ok: false };
  }

  if (!isValidEmail(cleanEmail)) {
    dispatch({
      type: FORGOT_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: "Please enter a valid email address.",
    });
    return { ok: false };
  }

  dispatch({ type: FORGOT_PASSWORD_ACTIONS.REQUEST_START });

  try {
    const { data } = await axiosInstance.post("/auth/forgot-password", {
      email: cleanEmail,
    });

    dispatch({
      type: FORGOT_PASSWORD_ACTIONS.REQUEST_SUCCESS,
      payload: {
        message:
          data?.message ||
          "If this email exists, a password reset link has been sent.",
        email: cleanEmail,
      },
    });

    return { ok: true, data };
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Unable to send reset link. Please try again.";

    dispatch({
      type: FORGOT_PASSWORD_ACTIONS.REQUEST_ERROR,
      payload: message,
    });

    return { ok: false, error: message };
  }
}

export function resetForgotPassword(dispatch) {
  dispatch({ type: FORGOT_PASSWORD_ACTIONS.RESET });
}