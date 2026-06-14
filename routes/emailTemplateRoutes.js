// routes/emailTemplateRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";

import {
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../controllers/adminEmailTemplateController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

const emailTemplateReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email template requests. Please slow down.",
  },
});

const emailTemplateWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email template write attempts. Please try again later.",
  },
});

router.use(authRequired, adminOnly);

router
  .route("/")
  .get(emailTemplateReadLimiter, getEmailTemplates)
  .post(
    emailTemplateWriteLimiter,
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    createEmailTemplate
  );

router
  .route("/:id")
  .get(emailTemplateReadLimiter, validateObjectId("id"), getEmailTemplateById)
  .put(
    emailTemplateWriteLimiter,
    validateObjectId("id"),
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    updateEmailTemplate
  )
  .delete(
    emailTemplateWriteLimiter,
    validateObjectId("id"),
    ...adminDeleteHardening,
    requireCsrf,
    deleteEmailTemplate
  );

export default router;