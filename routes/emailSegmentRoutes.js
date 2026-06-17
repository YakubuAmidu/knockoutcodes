// routes/emailSegmentRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";

import {
  createEmailSegment,
  getEmailSegments,
  getEmailSegmentById,
  updateEmailSegment,
  deleteEmailSegment,
} from "../controllers/emailSegmentController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

const emailSegmentReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email segment requests. Please slow down.",
  },
});

const emailSegmentWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email segment write attempts. Please try again later.",
  },
});

router.use(authRequired, adminOnly);

router
  .route("/")
  .get(emailSegmentReadLimiter, getEmailSegments)
  .post(
    emailSegmentWriteLimiter,
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    createEmailSegment,
  );

router
  .route("/:id")
  .get(emailSegmentReadLimiter, validateObjectId("id"), getEmailSegmentById)
  .put(
    emailSegmentWriteLimiter,
    validateObjectId("id"),
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    updateEmailSegment,
  )
  .delete(
    emailSegmentWriteLimiter,
    validateObjectId("id"),
    ...adminDeleteHardening,
    requireCsrf,
    deleteEmailSegment,
  );

export default router;
