import { EMAIL_SEGMENT_ACTIONS } from "./emailSegmentActionTypes";
import { emailSegmentInitialState } from "./emailSegmentInitialState";

export function emailSegmentReducer(state = emailSegmentInitialState, action) {
  switch (action.type) {
    case EMAIL_SEGMENT_ACTIONS.LIST_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_SEGMENT_ACTIONS.CREATE_REQUEST:
      return {
        ...state,
        creating: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_SEGMENT_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        updating: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_SEGMENT_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        deleting: true,
        error: null,
        successMessage: null,
      };

    case EMAIL_SEGMENT_ACTIONS.LIST_SUCCESS:
      return {
        ...state,
        loading: false,
        segments: action.payload || [],
      };

    case EMAIL_SEGMENT_ACTIONS.CREATE_SUCCESS:
      return {
        ...state,
        creating: false,
        segments: action.payload
          ? [action.payload, ...state.segments]
          : state.segments,
        successMessage: "Segment created successfully",
      };

    case EMAIL_SEGMENT_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        segments: state.segments.map((segment) =>
          segment._id === action.payload._id ? action.payload : segment,
        ),
        selectedSegment:
          state.selectedSegment?._id === action.payload._id
            ? action.payload
            : state.selectedSegment,
        successMessage: "Segment updated successfully",
      };

    case EMAIL_SEGMENT_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        segments: state.segments.filter(
          (segment) => segment._id !== action.payload,
        ),
        successMessage: "Segment deleted successfully",
      };

    case EMAIL_SEGMENT_ACTIONS.LIST_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case EMAIL_SEGMENT_ACTIONS.CREATE_FAIL:
      return {
        ...state,
        creating: false,
        error: action.payload,
      };

    case EMAIL_SEGMENT_ACTIONS.UPDATE_FAIL:
      return {
        ...state,
        updating: false,
        error: action.payload,
      };

    case EMAIL_SEGMENT_ACTIONS.DELETE_FAIL:
      return {
        ...state,
        deleting: false,
        error: action.payload,
      };

    case EMAIL_SEGMENT_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedSegment: action.payload,
      };

    case EMAIL_SEGMENT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case EMAIL_SEGMENT_ACTIONS.RESET_SUCCESS:
      return {
        ...state,
        successMessage: null,
      };

    default:
      return state;
  }
}
