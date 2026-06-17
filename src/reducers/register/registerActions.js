import { REGISTER_ACTIONS } from "./registerActionTypes";

export const updateRegisterField = (name, value) => ({
  type: REGISTER_ACTIONS.UPDATE_FIELD,
  payload: { name, value },
});

export const setRegisterError = (message) => ({
  type: REGISTER_ACTIONS.SET_ERROR,
  payload: message,
});

export const clearRegisterError = () => ({
  type: REGISTER_ACTIONS.CLEAR_ERROR,
});

export const registerRequest = () => ({
  type: REGISTER_ACTIONS.REQUEST,
});

export const registerSuccess = () => ({
  type: REGISTER_ACTIONS.SUCCESS,
});

export const registerFail = (message) => ({
  type: REGISTER_ACTIONS.FAIL,
  payload: message,
});

export const resetRegister = () => ({
  type: REGISTER_ACTIONS.RESET,
});
