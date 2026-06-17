import axiosInstance from "../../../utils/axiosInstance";
import { EMAIL_TEMPLATE_ACTIONS } from "./emailTemplateActionTypes";

const API_URL = "/admin/email-templates";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const fetchEmailTemplates =
  (params = {}) =>
  async (dispatch, getState) => {
    try {
      dispatch({ type: EMAIL_TEMPLATE_ACTIONS.LIST_REQUEST });

      const state = getState()?.emailTemplate || {};

      const queryParams = {
        page: params.page || state.pagination?.page || 1,
        limit: params.limit || state.pagination?.limit || 50,
        search: params.search ?? state.search ?? "",
        category:
          params.category ||
          (state.category === "all" ? "" : state.category) ||
          "",
        status:
          params.status || (state.status === "all" ? "" : state.status) || "",
        sort: params.sort || state.sort || "newest",
      };

      const { data } = await axiosInstance.get(API_URL, {
        params: queryParams,
      });

      dispatch({
        type: EMAIL_TEMPLATE_ACTIONS.LIST_SUCCESS,
        payload: {
          templates: data?.data || data?.templates || [],
          summary: data?.summary || {},
          pagination: data?.pagination || {},
        },
      });

      return { success: true, data };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch templates");

      dispatch({
        type: EMAIL_TEMPLATE_ACTIONS.LIST_FAIL,
        payload: message,
      });

      return { success: false, message };
    }
  };

export const getEmailTemplateDetails = (id) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.DETAILS_REQUEST });

    const { data } = await axiosInstance.get(`${API_URL}/${id}`);

    const template = data?.data || data?.template;

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.DETAILS_SUCCESS,
      payload: template,
    });

    return { success: true, template };
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch template details");

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.DETAILS_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const createEmailTemplate = (templateData) => async (dispatch) => {
  try {
    dispatch({ type: EMAIL_TEMPLATE_ACTIONS.CREATE_REQUEST });

    const { data } = await axiosInstance.post(API_URL, templateData);

    const template = data?.data || data?.template;

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.CREATE_SUCCESS,
      payload: template,
    });

    return { success: true, template };
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

    const template = data?.data || data?.template;

    dispatch({
      type: EMAIL_TEMPLATE_ACTIONS.UPDATE_SUCCESS,
      payload: template,
    });

    return { success: true, template };
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

export const duplicateEmailTemplate = (template) => async (dispatch) => {
  if (!template) {
    return {
      success: false,
      message: "No template selected for duplicate",
    };
  }

  return dispatch(
    createEmailTemplate({
      name: `${template.name || "Template"} Copy`,
      subject: template.subject || "",
      previewText: template.previewText || "",
      headline: template.headline || "",
      body: template.body || "",
      ctaText: template.ctaText || "Learn More",
      ctaUrl: template.ctaUrl || "",
      category: template.category || "newsletter",
      status: "draft",
      isActive: false,
      notes: template.notes || "",
    }),
  );
};

export const setSelectedEmailTemplate = (template) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_SELECTED,
  payload: template,
});

export const clearSelectedEmailTemplate = () => ({
  type: EMAIL_TEMPLATE_ACTIONS.CLEAR_SELECTED,
});

export const setEmailTemplateSearch = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_SEARCH,
  payload: value,
});

export const setEmailTemplateCategory = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_CATEGORY,
  payload: value,
});

export const setEmailTemplateStatus = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_STATUS,
  payload: value,
});

export const setEmailTemplateSort = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_SORT,
  payload: value,
});

export const setEmailTemplatePage = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_PAGE,
  payload: value,
});

export const setEmailTemplateLimit = (value) => ({
  type: EMAIL_TEMPLATE_ACTIONS.SET_LIMIT,
  payload: value,
});

export const clearEmailTemplateError = () => ({
  type: EMAIL_TEMPLATE_ACTIONS.CLEAR_ERROR,
});

export const resetEmailTemplateSuccess = () => ({
  type: EMAIL_TEMPLATE_ACTIONS.RESET_SUCCESS,
});
