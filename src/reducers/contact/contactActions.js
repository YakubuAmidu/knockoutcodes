// src/reducers/contact/contactActions.js
import { CONTACT_ACTIONS } from "./contactActionTypes";

export const hydrateContactFromStorage = (payload) => ({
  type: CONTACT_ACTIONS.HYDRATE_FROM_STORAGE,
  payload,
});

export const updateContactField = (name, value) => ({
  type: CONTACT_ACTIONS.UPDATE_FIELD,
  payload: { name, value },
});

export const setContactStatus = (state, message = "") => ({
  type: CONTACT_ACTIONS.SET_STATUS,
  payload: { state, message },
});

export const resetContactAfterSuccess = () => ({
  type: CONTACT_ACTIONS.RESET_AFTER_SUCCESS,
});

export const resetContactAll = () => ({
  type: CONTACT_ACTIONS.RESET_ALL,
});
