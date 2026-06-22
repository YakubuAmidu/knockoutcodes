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

import { csrfRequired } from "../middleware/csrfMiddleware.js";
import { writeShield, allowMethods } from "../middleware/securityShield.js";

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
  .post(
    allowMethods(["POST"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    createLesson,
  );

// Public preview + paid/enrolled/membership access
router.get("/by-course/:courseId", optionalAuth, getLessonsByCourse);

// Authenticated user progress
router.put("/progress/:lessonId", authRequired, updateLessonProgress);

// Single lesson
router
  .route("/:id")
  .get(optionalAuth, getLesson)
  .put(
    allowMethods(["PUT"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    updateLesson,
  )
  .delete(
    allowMethods(["DELETE"]),
    writeShield,
    authRequired,
    adminOnly,
    csrfRequired,
    deleteLesson,
  );

export default router;
