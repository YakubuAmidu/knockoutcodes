import * as T from "./enrollmentActionTypes.js";

export const enrollmentReducer = (state, action) => {
  switch (action.type) {
    case T.ENROLLMENT_FETCH_MY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case T.ENROLLMENT_FETCH_MY_SUCCESS:
      return {
        ...state,
        loading: false,
        myEnrollments: action.payload,
      };

    case T.ENROLLMENT_FETCH_MY_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case T.ENROLLMENT_CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
