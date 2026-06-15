import { MANAGE_REVENUE_ACTIONS } from "./manageRevenueActionTypes";

const getId = (item) => item?._id || item?.id;

export const manageRevenueReducer = (state, action) => {
  switch (action.type) {
    case MANAGE_REVENUE_ACTIONS.FETCH_START:
      return { ...state, loading: true, error: "" };

    case MANAGE_REVENUE_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        revenues: action.payload?.revenues || [],
        summary: {
          ...state.summary,
          ...(action.payload?.summary || {}),
        },
        error: "",
      };

    case MANAGE_REVENUE_ACTIONS.FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case MANAGE_REVENUE_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedRevenue: action.payload,
        editRevenue: action.payload,
      };

    case MANAGE_REVENUE_ACTIONS.CLEAR_SELECTED:
      return {
        ...state,
        selectedRevenue: null,
        editRevenue: null,
      };

    case MANAGE_REVENUE_ACTIONS.UPDATE_FIELD:
      return {
        ...state,
        editRevenue: {
          ...(state.editRevenue || {}),
          [action.payload.name]: action.payload.value,
        },
      };

    case MANAGE_REVENUE_ACTIONS.UPDATE_START:
      return { ...state, updating: true, error: "" };

    case MANAGE_REVENUE_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        updating: false,
        revenues: state.revenues.map((item) =>
          getId(item) === getId(action.payload) ? action.payload : item
        ),
        selectedRevenue: action.payload,
        editRevenue: action.payload,
        error: "",
      };

    case MANAGE_REVENUE_ACTIONS.UPDATE_FAILURE:
      return { ...state, updating: false, error: action.payload };

    case MANAGE_REVENUE_ACTIONS.DELETE_START:
      return { ...state, deleting: true, error: "" };

    case MANAGE_REVENUE_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        deleting: false,
        revenues: state.revenues.filter((item) => getId(item) !== action.payload),
        selectedRevenue: null,
        editRevenue: null,
        error: "",
      };

    case MANAGE_REVENUE_ACTIONS.DELETE_FAILURE:
      return { ...state, deleting: false, error: action.payload };

    case MANAGE_REVENUE_ACTIONS.SET_SEARCH:
      return { ...state, search: action.payload };

    case MANAGE_REVENUE_ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };

    case MANAGE_REVENUE_ACTIONS.RESET_ERROR:
      return { ...state, error: "" };

    default:
      return state;
  }
};