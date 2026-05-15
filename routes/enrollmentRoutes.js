import express from "express";
import {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentStatus,
  getTopCoursesByEnrollments,
  updateEnrollmentProgress,
  verifyStripeEnrollment,
} from "../controllers/enrollmentController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ADMIN ONLY:
 * Manual enrollment creation.
 * Normal users must enroll through Stripe checkout/webhook.
 */
router.post("/", authRequired, adminOnly, createEnrollment);

/**
 * USER:
 * Get my enrollments.
 */
router.get("/my", authRequired, getMyEnrollments);

/**
 * USER:
 * Check if current user owns access to one course.
 */
router.get("/status/:courseId", authRequired, getEnrollmentStatus);

/**
 * USER:
 * Verify Stripe checkout session and create enrollment if payment succeeded.
 */
router.post("/verify-stripe-session", authRequired, verifyStripeEnrollment);

/**
 * ADMIN:
 * Analytics/top courses.
 */
router.get("/top-courses", authRequired, adminOnly, getTopCoursesByEnrollments);

/**
 * USER:
 * Update progress only for their own enrollment.
 */
router.put("/:id/progress", authRequired, updateEnrollmentProgress);

export default router;