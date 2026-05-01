// src/redux/user/userInitialState.js
export const userInitialState = {
  // profile fetch
  loading: true,
  me: null,
  error: "",

  // edit & save
  editMode: false,
  saving: false,
  saveError: "",

  // form (mirrors your UI fields)
  form: null,

  // avatar
  avatarFile: null,
  avatarPreview: "",

  // password section
  showPassword: false,
  pwSaving: false,
  pwError: "",
  pw: {
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  },
};
