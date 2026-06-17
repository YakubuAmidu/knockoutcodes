import express from "express";
import {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentStatus,
  getTopCoursesByEnrollments,
  updateEnrollmentProgress,
  verifyStripeEnrollment,
  getAllEnrollmentsAdmin,
  updateEnrollmentAdmin,
  deleteEnrollmentAdmin,
} from "../controllers/enrollmentController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ADMIN ONLY:
 * Manual enrollment creation.
 */
router.post("/", authRequired, adminOnly, createEnrollment);

/**
 * USER:
 * Get logged-in user's enrollments.
 */
router.get("/my", authRequired, getMyEnrollments);

/**
 * ADMIN:
 * Top enrolled courses analytics.
 * Keep before dynamic routes.
 */
router.get("/top-courses", authRequired, adminOnly, getTopCoursesByEnrollments);

/**
 * USER:
 * Check course enrollment/access status.
 */
router.get("/status/:courseId", authRequired, getEnrollmentStatus);

/**
 * USER:
 * Verify Stripe checkout session after successful payment.
 */
router.post("/verify-stripe-session", authRequired, verifyStripeEnrollment);

/**
 * ADMIN:
 * Manage all enrollments.
 */
router.get("/admin/manage", authRequired, adminOnly, getAllEnrollmentsAdmin);

/**
 * ADMIN:
 * Update enrollment.
 */
router.put("/:id", authRequired, adminOnly, updateEnrollmentAdmin);

/**
 * ADMIN:
 * Delete enrollment.
 */
router.delete("/:id", authRequired, adminOnly, deleteEnrollmentAdmin);

/**
 * USER:
 * Update progress for owned enrollment only.
 */
router.put("/:id/progress", authRequired, updateEnrollmentProgress);

export default router;
