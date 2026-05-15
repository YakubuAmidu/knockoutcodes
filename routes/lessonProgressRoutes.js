import express from "express";
import { updateLessonProgress } from "../controllers/lessonProgressController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.put("/:lessonId", authRequired, updateLessonProgress);

export default router;