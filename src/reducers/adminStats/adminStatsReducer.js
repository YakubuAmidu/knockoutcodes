import { adminStatsInitialState } from "./adminStatsInitialState";
import {
  ADMIN_STATS_REQUEST,
  ADMIN_STATS_SUCCESS,
  ADMIN_STATS_FAIL,
  ADMIN_STATS_RESET,
} from "./adminStatsActionTypes";

export const adminStatsReducer = (
  state = adminStatsInitialState,
  action
) => {
  switch (action.type) {
    case ADMIN_STATS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        success: false,
      };

    case ADMIN_STATS_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        stats: action.payload,
        error: null,
        lastFetched: new Date().toISOString(),
      };

    case ADMIN_STATS_FAIL:
      return {
        ...state,
        loading: false,
        success: false,
        error: action.payload,
      };

    case ADMIN_STATS_RESET:
      return adminStatsInitialState;

    default:
      return state;
  }
};