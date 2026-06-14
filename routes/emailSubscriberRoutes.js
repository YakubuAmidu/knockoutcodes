import express from "express";
import rateLimit from "express-rate-limit";

import {
  createEmailSubscriber,
  getEmailSubscribers,
  getEmailSubscriberById,
  updateEmailSubscriber,
  deleteEmailSubscriber,
  bulkUpdateEmailSubscribers,
  bulkDeleteEmailSubscribers,
} from "../controllers/adminEmailSubscriberController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

const emailSubscriberReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email subscriber requests. Please slow down.",
  },
});

const emailSubscriberWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email subscriber write attempts. Please try again later.",
  },
});

router.use(authRequired, adminOnly);

router
  .route("/")
  .get(emailSubscriberReadLimiter, getEmailSubscribers)
  .post(
    emailSubscriberWriteLimiter,
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    createEmailSubscriber
  );

router.put(
  "/bulk/status",
  emailSubscriberWriteLimiter,
  requireJsonContent,
  ...adminRequestHardening,
  requireCsrf,
  bulkUpdateEmailSubscribers
);

router.delete(
  "/bulk",
  emailSubscriberWriteLimiter,
  requireJsonContent,
  ...adminDeleteHardening,
  requireCsrf,
  bulkDeleteEmailSubscribers
);

router
  .route("/:id")
  .get(emailSubscriberReadLimiter, validateObjectId("id"), getEmailSubscriberById)
  .put(
    emailSubscriberWriteLimiter,
    validateObjectId("id"),
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    updateEmailSubscriber
  )
  .delete(
    emailSubscriberWriteLimiter,
    validateObjectId("id"),
    ...adminDeleteHardening,
    requireCsrf,
    deleteEmailSubscriber
  );

export default router;