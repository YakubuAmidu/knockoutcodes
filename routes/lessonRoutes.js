import express from "express";
import {
  createLesson,
  getAllLessons,
  getLessonsByCourse,
  getLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController.js";

import {
  authRequired,
  adminOnly,
  optionalAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin only: get all lessons + create lesson
router
  .route("/")
  .get(authRequired, adminOnly, getAllLessons)
  .post(authRequired, adminOnly, createLesson);

// Public previews + paid-user full access
router.get("/by-course/:courseId", optionalAuth, getLessonsByCourse);

// Single lesson
router
  .route("/:id")
  .get(optionalAuth, getLesson)
  .put(authRequired, adminOnly, updateLesson)
  .delete(authRequired, adminOnly, deleteLesson);

export default router;