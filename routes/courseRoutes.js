// routes/courseRoutes.js
import express from 'express';
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getCoursePlayer,
} from "../controllers/courseController.js";

// If you already have auth middleware, plug it in:
import { authRequired, adminOnly } from '../middleware/authMiddleware.js';
import { requireEnrollment } from '../middleware/requireEnrollment.js';

const router = express.Router();

router
  .route('/')
  .get(getCourses)
  // .post(protect, admin, createCourse);
  .post(authRequired, adminOnly, createCourse); // <-- add protect/admin when ready

router
  .route('/:id')
  .get(getCourse)
  .put(authRequired, adminOnly, updateCourse)
  .delete(authRequired, adminOnly, deleteCourse);

router.route("/player/:courseId", authRequired, requireEnrollment, getCoursePlayer);

export default router;
