// src/reducers/user/userReducer.js
import { userInitialState } from "./userInitialState";
import * as T from "./userActionTypes";

/**
 * ✅ Helper: builds the UI form shape from the `me` object.
 * This ensures every controlled input has a real value (never undefined / null).
 */
function buildFormFromMe(me) {
  const u = me || {};
  return {
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    location: u.location || "",
    website: u.website || "",
    instagram: u.instagram || "",
    tiktok: u.tiktok || "",
    youtube: u.youtube || "",
    xhandle: u.xhandle || "",
    headline: u.headline || "",
    bio: u.bio || "",
    // ✅ Keep your current meaning: notifications enabled unless explicitly false
    notifications: u.notifications !== false,
  };
}

export function userReducer(state = userInitialState, action) {
  switch (action.type) {
    // ===== Load /me =====
    case T.USER_ME_REQUEST: {
      return { ...state, loading: true, error: "" };
    }

    case T.USER_ME_SUCCESS: {
      const me = action.payload;

      return {
        ...state,
        loading: false,
        me,
        error: "",
        /**
         * ✅ KEY FIX:
         * If NOT currently editing, always keep `form` synced to latest `me`.
         * This prevents stale/blank form values and fixes textarea/input issues.
         */
        form: state.editMode ? { ...state.form } : buildFormFromMe(me),
      };
    }

    case T.USER_ME_FAIL: {
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load profile.",
      };
    }

    // ===== Edit mode =====
    case T.USER_ME_SET_EDIT_MODE: {
      const turningOn = !!action.payload;

      return {
        ...state,
        editMode: turningOn,
        saveError: "",
        /**
         * ✅ KEY FIX:
         * When turning ON edit mode, guarantee `form` is initialized from `me`.
         * This makes ALL inputs (including textarea) type correctly every time.
         */
        form: turningOn ? (state.form || buildFormFromMe(state.me)) : state.form,
      };
    }

    // ===== Form updates =====
    case T.USER_ME_FORM_UPDATE: {
      return {
        ...state,
        form: { ...(state.form || {}), ...(action.payload || {}) },
      };
    }

    case T.USER_ME_FORM_RESET: {
      return {
        ...state,
        form: action.payload || null,
        saveError: "",
      };
    }

    // ===== Save profile =====
    case T.USER_ME_SAVE_REQUEST: {
      return { ...state, saving: true, saveError: "" };
    }

    case T.USER_ME_SAVE_SUCCESS: {
      const me = action.payload || state.me;

      return {
        ...state,
        saving: false,
        saveError: "",
        editMode: false,
        me,
        /**
         * ✅ After saving, sync the form to the saved user so UI is consistent.
         */
        form: buildFormFromMe(me),
      };
    }

    case T.USER_ME_SAVE_FAIL: {
      return {
        ...state,
        saving: false,
        saveError: action.payload || "Failed to save changes.",
      };
    }

    // ===== Avatar =====
    case T.USER_AVATAR_SET_FILE: {
      return {
        ...state,
        avatarFile: action.payload?.file || null,
        avatarPreview: action.payload?.preview || "",
      };
    }

    case T.USER_AVATAR_CLEAR: {
      return { ...state, avatarFile: null, avatarPreview: "" };
    }

    // ===== Password =====
    case T.USER_PASSWORD_PANEL_TOGGLE: {
      return {
        ...state,
        showPassword: !state.showPassword,
        pwError: "",
        pwSaving: false,
      };
    }

    case T.USER_PASSWORD_UPDATE_FIELD: {
      return {
        ...state,
        pw: { ...state.pw, ...(action.payload || {}) },
      };
    }

    case T.USER_PASSWORD_RESET: {
      return {
        ...state,
        pwError: "",
        pwSaving: false,
        pw: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
      };
    }

    // ===== Logout =====
    case T.USER_LOGOUT: {
      return { ...userInitialState, loading: false };
    }

    default:
      return state;
  }
}
