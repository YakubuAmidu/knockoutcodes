// routes/lessonRoutes.js
import express from "express";
import {
  createLesson,
  getAllLessons,
  getLessonsByCourse,
  getLesson,
  updateLesson,
  deleteLesson,
  updateLessonProgress,
} from "../controllers/lessonController.js";

import {
  authRequired,
  adminOnly,
  optionalAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin only
router
  .route("/")
  .get(authRequired, adminOnly, getAllLessons)
  .post(authRequired, adminOnly, createLesson);

// Public preview + paid/enrolled/membership access
router.get("/by-course/:courseId", optionalAuth, getLessonsByCourse);

// Authenticated user progress
router.put("/progress/:lessonId", authRequired, updateLessonProgress);

// Single lesson
router
  .route("/:id")
  .get(optionalAuth, getLesson)
  .put(authRequired, adminOnly, updateLesson)
  .delete(authRequired, adminOnly, deleteLesson);

export default router;