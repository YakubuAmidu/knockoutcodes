import express from "express";
import {
  createLesson,
  getLessonsByCourse,
  getLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin: create a new lesson
router.post("/", authRequired, adminOnly, createLesson);

// Get lessons for a specific course
// Optional: allow previews for logged-out users by leaving it public,
// BUT we still read req.user if provided (middleware below makes it better).
router.get("/by-course/:courseId", getLessonsByCourse);

// Single lesson CRUD by id or slug
router
  .route("/:id")
  .get(getLesson)
  .put(authRequired, adminOnly, updateLesson)
  .delete(authRequired, adminOnly, deleteLesson);

export default router;

