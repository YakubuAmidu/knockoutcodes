import { MANAGE_MEMBERSHIPS_ACTIONS } from "./manageMembershipActionTypes";
import { manageMembershipsInitialState } from "./manageMembershipInitialState";

export function manageMembershipsReducer(
  state = manageMembershipsInitialState,
  action
) {
  switch (action.type) {
    case MANAGE_MEMBERSHIPS_ACTIONS.FETCH_REQUEST:
      return {
        ...state,
        loading: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        memberships: Array.isArray(action.payload?.data)
          ? action.payload.data
          : [],
        pagination: action.payload?.pagination || state.pagination,
        error: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.FETCH_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to fetch memberships.",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.CREATE_REQUEST:
    case MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        saving: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.CREATE_SUCCESS: {
  const memberships = [
    action.payload,
    ...state.memberships.filter(
      (item) => item?._id !== action.payload?._id
    ),
  ];

  return {
    ...state,
    saving: false,
    memberships,
    successMessage: "Membership created successfully.",
    error: "",
  };
}

    case MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        saving: false,
        memberships: state.memberships.map((membership) =>
          membership?._id === action.payload?._id ? action.payload : membership
        ),
        selectedMembership: action.payload,
        successMessage: "Membership updated successfully.",
        error: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.CREATE_FAIL:
    case MANAGE_MEMBERSHIPS_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Failed to save membership.",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: "",
        successMessage: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        memberships: state.memberships.filter(
          (membership) => membership?._id !== action.payload
        ),
        selectedMembership:
          state.selectedMembership?._id === action.payload
            ? null
            : state.selectedMembership,
        successMessage: "Membership deleted successfully.",
        error: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload || "Failed to delete membership.",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.SET_SELECTED_MEMBERSHIP:
      return {
        ...state,
        selectedMembership: action.payload,
        error: "",
        successMessage: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.CLEAR_SELECTED_MEMBERSHIP:
      return {
        ...state,
        selectedMembership: null,
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.SET_SEARCH:
  return {
    ...state,
    search: String(action.payload || "").trimStart().slice(0, 120),
  };

    case MANAGE_MEMBERSHIPS_ACTIONS.SET_LEVEL_FILTER: {
  const allowedLevels = [
    "all",
    "beginner",
    "intermediate",
    "advance",
    "complete",
  ];

  const nextLevel = String(action.payload || "").toLowerCase().trim();

  return {
    ...state,
    levelFilter: allowedLevels.includes(nextLevel) ? nextLevel : "all",
  };
}

    case MANAGE_MEMBERSHIPS_ACTIONS.SET_STATUS_FILTER: {
  const allowedStatuses = ["all", "published", "draft", "featured"];

  return {
    ...state,
    statusFilter: allowedStatuses.includes(action.payload)
      ? action.payload
      : "all",
  };
}

    case MANAGE_MEMBERSHIPS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: "",
        successMessage: "",
      };

    case MANAGE_MEMBERSHIPS_ACTIONS.RESET:
      return manageMembershipsInitialState;

    default:
      return state;
  }
}

export default manageMembershipsReducer;