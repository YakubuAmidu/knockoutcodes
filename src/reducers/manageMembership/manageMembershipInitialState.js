export const manageMembershipsInitialState = {
  memberships: [],
  pagination: {
    page: 1,
    limit: 100,
    total: 0,
    pages: 1,
  },
  selectedMembership: null,
  loading: false,
  saving: false,
  deleting: false,
  error: "",
  successMessage: "",
  search: "",
  levelFilter: "all",
  statusFilter: "all",
};