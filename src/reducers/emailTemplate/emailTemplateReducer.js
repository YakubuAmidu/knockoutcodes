import { EMAIL_TEMPLATE_ACTIONS } from "./emailTemplateActionTypes";
import { emailTemplateInitialState } from "./emailTemplateInitialState";

export function emailTemplateReducer(
  state = emailTemplateInitialState,
  action,
) {
  switch (action.type) {
    case EMAIL_TEMPLATE_ACTIONS.LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.DETAILS_REQUEST:
      return {
        ...state,
        detailsLoading: true,
        error: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.CREATE_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
        success: false,
        successMessage: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        success: false,
        successMessage: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
        success: false,
        successMessage: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        templates: action.payload?.templates || [],
        summary: {
          ...state.summary,
          ...(action.payload?.summary || {}),
        },
        pagination: {
          ...state.pagination,
          ...(action.payload?.pagination || {}),
        },
        error: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.DETAILS_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        selectedTemplate: action.payload,
        error: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.CREATE_SUCCESS:
      return {
        ...state,
        creating: false,
        templates: [action.payload, ...state.templates],
        success: true,
        successMessage: "Template created successfully",
      };

    case EMAIL_TEMPLATE_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        templates: state.templates.map((template) =>
          template._id === action.payload._id ? action.payload : template,
        ),
        selectedTemplate:
          state.selectedTemplate?._id === action.payload._id
            ? action.payload
            : state.selectedTemplate,
        success: true,
        successMessage: "Template updated successfully",
      };

    case EMAIL_TEMPLATE_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        templates: state.templates.filter(
          (template) => template._id !== action.payload,
        ),
        selectedTemplate:
          state.selectedTemplate?._id === action.payload
            ? null
            : state.selectedTemplate,
        success: true,
        successMessage: "Template deleted successfully",
      };

    case EMAIL_TEMPLATE_ACTIONS.LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.DETAILS_FAIL:
      return {
        ...state,
        detailsLoading: false,
        error: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.CREATE_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedTemplate: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.CLEAR_SELECTED:
      return {
        ...state,
        selectedTemplate: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_CATEGORY:
      return {
        ...state,
        category: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_STATUS:
      return {
        ...state,
        status: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: action.payload,
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_PAGE:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          page: action.payload,
        },
      };

    case EMAIL_TEMPLATE_ACTIONS.SET_LIMIT:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          limit: action.payload,
          page: 1,
        },
      };

    case EMAIL_TEMPLATE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case EMAIL_TEMPLATE_ACTIONS.RESET_SUCCESS:
      return {
        ...state,
        success: false,
        successMessage: null,
      };

    default:
      return state;
  }
}
