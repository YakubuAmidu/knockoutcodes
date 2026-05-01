// routes/enrollmentRoutes.js
import express from "express";
import {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentStatus,
  getTopCoursesByEnrollments,
  updateEnrollmentProgress
} from "../controllers/enrollmentController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// Create an enrollment (later: protect this)
router.post("/", authRequired, createEnrollment);

// Get enrollments for the current user
router.get(
  "/my",
  authRequired, getMyEnrollments
);

// Check if the current user is enrolled in a specific course
router.get(
  "/status/:courseId",
  authRequired, getEnrollmentStatus
);

// Top performing courses by enrollments (later: protect + admin)
router.get(
  "/top-courses",
  authRequired, adminOnly, getTopCoursesByEnrollments
);

// ✅ Update enrollment progress for current user
router.put("/:id/progress", authRequired, updateEnrollmentProgress);

export default router;


