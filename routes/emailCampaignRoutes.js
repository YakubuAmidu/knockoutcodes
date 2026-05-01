import express from "express";
import rateLimit from "express-rate-limit";

import {
  createEmailCampaign,
  getEmailCampaigns,
  getEmailCampaignById,
  updateEmailCampaign,
  scheduleEmailCampaign,
  pauseEmailCampaign,
  deleteEmailCampaign,
} from "../controllers/emailCampaignController.js";

import {
  sendEmailCampaignNow,
  retryFailedCampaign,
} from "../controllers/emailCampaignSendController.js";

import { unsubscribeEmail } from "../controllers/emailCampaignPublicController.js";

import {
  getEmailCampaignAnalytics,
  getEmailCampaignAnalyticsById,
} from "../controllers/emailCampaignAnalyticsController.js";

import {
  trackEmailOpen,
  trackEmailClick,
} from "../controllers/emailCampaignTrackingController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";
import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

const emailCampaignWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email campaign write attempts. Please try again later.",
  },
});

const emailCampaignReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

const publicTrackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many tracking requests",
});

/* -------------------------------------------------------------------------- */
/*                               Public routes                                */
/* -------------------------------------------------------------------------- */

router.get("/track/open", publicTrackingLimiter, trackEmailOpen);
router.get("/track/click", publicTrackingLimiter, trackEmailClick);

router.get("/unsubscribe", unsubscribeEmail);
router.post(
  "/unsubscribe",
  emailCampaignWriteLimiter,
  requireJsonContent,
  unsubscribeEmail
);

/* -------------------------------------------------------------------------- */
/*                          Protected admin routes                            */
/* -------------------------------------------------------------------------- */

router.use(authRequired, adminOnly);

router.get(
  "/analytics/overview",
  emailCampaignReadLimiter,
  getEmailCampaignAnalytics
);

router.get(
  "/analytics/:id",
  emailCampaignReadLimiter,
  validateObjectId("id"),
  getEmailCampaignAnalyticsById
);

router
  .route("/")
  .get(emailCampaignReadLimiter, getEmailCampaigns)
  .post(
    emailCampaignWriteLimiter,
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    createEmailCampaign
  );

router
  .route("/:id")
  .get(emailCampaignReadLimiter, validateObjectId("id"), getEmailCampaignById)
  .put(
    emailCampaignWriteLimiter,
    validateObjectId("id"),
    requireJsonContent,
    ...adminRequestHardening,
    requireCsrf,
    updateEmailCampaign
  )
  .delete(
    emailCampaignWriteLimiter,
    validateObjectId("id"),
    ...adminDeleteHardening,
    requireCsrf,
    deleteEmailCampaign
  );

router.put(
  "/:id/schedule",
  emailCampaignWriteLimiter,
  validateObjectId("id"),
  requireJsonContent,
  ...adminRequestHardening,
  requireCsrf,
  scheduleEmailCampaign
);

router.put(
  "/:id/pause",
  emailCampaignWriteLimiter,
  validateObjectId("id"),
  requireJsonContent,
  ...adminRequestHardening,
  requireCsrf,
  pauseEmailCampaign
);

router.post(
  "/:id/send",
  emailCampaignWriteLimiter,
  validateObjectId("id"),
  requireJsonContent,
  ...adminRequestHardening,
  requireCsrf,
  sendEmailCampaignNow
);

router.post(
  "/:id/retry",
  emailCampaignWriteLimiter,
  validateObjectId("id"),
  requireJsonContent,
  ...adminRequestHardening,
  requireCsrf,
  retryFailedCampaign
);

export default router;