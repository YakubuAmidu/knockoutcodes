import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_TEMPLATE_ACTIONS } from "./emailTemplateActionTypes";

const API_URL = "/admin/email-templates";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchEmailTemplates = () => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.LIST_REQUEST });

    const { data } = await axiosInstance.get(API_URL);

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.LIST_SUCCESS,
      payload: data?.templates || [],
    });
  } catch (error) {
    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.LIST_FAIL,
      payload: getErrorMessage(error, "Failed to fetch templates"),
    });
  }
};

export const createEmailTemplate = (templateData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post(API_URL, templateData);

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.CREATE_SUCCESS,
      payload: data?.template,
    });

    return { success: true, template: data?.template };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create template");

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.CREATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const updateEmailTemplate = (id, templateData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.UPDATE_REQUEST });

    const { data } = await axiosInstance.put(`${API_URL}/${id}`, templateData);

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.UPDATE_SUCCESS,
      payload: data?.template,
    });

    return { success: true, template: data?.template };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update template");

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.UPDATE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const deleteEmailTemplate = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.DELETE_REQUEST });

    await axiosInstance.delete(`${API_URL}/${id}`);

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.DELETE_SUCCESS,
      payload: id,
    });

    return { success: true };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete template");

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.DELETE_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const setSelectedEmailTemplate = (template) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_SELECTED,
  payload: template,
});

export const clearEmailTemplateError = () => ({
  type: EMAIL_TEMPLATE_ACTIONS.CLEAR_ERROR,
});

export const resetEmailTemplateSuccess = () => ({
  type: EMAIL_TEMPLATE_ACTIONS.RESET_SUCCESS,
});