import { EMAIL_CAMPAIGN_ACTIONS } from "./emailCampaignActionTypes";
import { emailCampaignInitialState } from "./emailCampaignInitialState";

export function emailCampaignReducer(
  state = emailCampaignInitialState,
  action
) {
  switch (action.type) {
    case EMAIL_CAMPAIGN_ACTIONS.LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.CREATE_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.SEND_REQUEST:
      return {
        ...state,
        sending: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.ANALYTICS_REQUEST:
      return {
        ...state,
        analyticsLoading: true,
        error: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        campaigns: Array.isArray(action.payload) ? action.payload : [],
        pagination: action.meta || null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.CREATE_SUCCESS: {
      const newCampaign = action.payload;

      return {
        ...state,
        creating: false,
        campaigns: newCampaign
          ? [newCampaign, ...state.campaigns]
          : state.campaigns,
        successMessage: "Campaign created successfully",
      };
    }

    case EMAIL_CAMPAIGN_ACTIONS.UPDATE_SUCCESS: {
      const updatedCampaign = action.payload;

      if (!updatedCampaign?._id) {
        return {
          ...state,
          updating: false,
          successMessage: "Campaign updated successfully",
        };
      }

      return {
        ...state,
        updating: false,
        campaigns: state.campaigns.map((campaign) =>
          campaign?._id === updatedCampaign._id ? updatedCampaign : campaign
        ),
        selectedCampaign:
          state.selectedCampaign?._id === updatedCampaign._id
            ? updatedCampaign
            : state.selectedCampaign,
        successMessage: "Campaign updated successfully",
      };
    }

    case EMAIL_CAMPAIGN_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        campaigns: state.campaigns.filter(
          (campaign) => campaign?._id !== action.payload
        ),
        selectedCampaign:
          state.selectedCampaign?._id === action.payload
            ? null
            : state.selectedCampaign,
        successMessage: "Campaign deleted successfully",
      };

  case EMAIL_CAMPAIGN_ACTIONS.SEND_SUCCESS: {
  const sentCampaign = action.payload;

  return {
    ...state,
    sending: false,
    campaigns: sentCampaign?._id
      ? state.campaigns.map((campaign) =>
          campaign?._id === sentCampaign._id ? sentCampaign : campaign
        )
      : state.campaigns,
    selectedCampaign:
      state.selectedCampaign?._id === sentCampaign?._id
        ? sentCampaign
        : state.selectedCampaign,
    successMessage: "Campaign sent successfully",
  };
}

    case EMAIL_CAMPAIGN_ACTIONS.ANALYTICS_SUCCESS:
      return {
        ...state,
        analyticsLoading: false,
        analytics: action.payload || null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.CREATE_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.SEND_FAIL:
      return {
        ...state,
        sending: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.ANALYTICS_FAIL:
      return {
        ...state,
        analyticsLoading: false,
        error: action.payload,
      };

    case EMAIL_CAMPAIGN_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedCampaign: action.payload || null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case EMAIL_CAMPAIGN_ACTIONS.RESET_SUCCESS:
      return {
        ...state,
        successMessage: null,
      };

    default:
      return state;
  }
}