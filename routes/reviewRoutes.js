import express from "express";
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getAdminReviews,
  approveReview,
  unapproveReview,
} from "../controllers/reviewController.js";
import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { reviewCreateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/", getReviews);

router.get("/admin/all", authRequired, adminOnly, getAdminReviews);
router.patch("/admin/:id/approve", authRequired, adminOnly, approveReview);
router.patch("/admin/:id/unapprove", authRequired, adminOnly, unapproveReview);

router.post(
  "/",
  authRequired,
  preventAdminPurchase,
  reviewCreateLimiter,
  createReview
);

router
  .route("/:id")
  .get(getReviewById)
  .put(authRequired, updateReview)
  .delete(authRequired, deleteReview);

export default router;