// routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getAdminReviews,
  approveReview,
} from "../controllers/reviewController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

import { reviewCreateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Public: get reviews (optionally by courseId)
router.get("/", getReviews);

// Admin: get all reviews (including unapproved)
router.get("/admin/all", authRequired, adminOnly, getAdminReviews);

// Admin must approve it before it shows
router.patch("/admin/:id/approve", authRequired, adminOnly, approveReview);

// Create review (user), get single, update, delete
router.post("/", authRequired, reviewCreateLimiter, createReview);

router
  .route("/:id")
  .get(getReviewById)
  .put(authRequired, updateReview)
  .delete(authRequired, deleteReview);

export default router;
