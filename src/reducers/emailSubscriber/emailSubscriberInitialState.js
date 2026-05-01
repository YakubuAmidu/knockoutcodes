export const emailSubscriberInitialState = {
  loading: false,
  updating: false,
  deleting: false,

  subscribers: [],
  selectedSubscriber: null,

  search: "",
  filter: "all",

  error: null,
  success: false,
  successMessage: "",
};