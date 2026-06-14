export const manageReviewInitialState = {
  loading: false,
  error: "",
  reviews: [],
  meta: {
    total: 0,
    page: 1,
    pages: 1,
    stats: {
      total: 0,
      approved: 0,
      pending: 0,
      averageRating: 0,
    },
  },
};