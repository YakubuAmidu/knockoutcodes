import { MY_COURSES_ACTIONS } from "./myCoursesActionTypes";
import { myCoursesInitialState } from "./myCoursesInitialState";

export const myCoursesReducer = (state = myCoursesInitialState, action) => {
  switch (action.type) {
    case MY_COURSES_ACTIONS.FETCH_MY_COURSES_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case MY_COURSES_ACTIONS.FETCH_MY_COURSES_SUCCESS:
      return {
        ...state,
        loading: false,
        enrollments: action.payload,
        error: null,
      };

    case MY_COURSES_ACTIONS.FETCH_MY_COURSES_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case MY_COURSES_ACTIONS.RESET_MY_COURSES:
      return myCoursesInitialState;

    default:
      return state;
  }
};