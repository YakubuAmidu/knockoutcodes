import express from "express";
import {
  createNewsletter,
  getNewsletters,
  getNewsletter,
  updateNewsletter,
  deleteNewsletter,
} from "../controllers/newsletterController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import {
  newsletterBodyGuard,
  newsletterQueryGuard,
} from "../middleware/newsletterMiddleware.js";
import {
  newsletterSubscribeLimiter,
  newsletterAdminReadLimiter,
  newsletterAdminWriteLimiter,
} from "../middleware/newsletterRateLimit.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";

const router = express.Router();

// PUBLIC subscribe
router.post(
  "/",
  newsletterSubscribeLimiter,
  csrfRequired,
  newsletterBodyGuard,
  createNewsletter
);

// Admin only
router.get(
  "/",
  authRequired,
  adminOnly,
  newsletterAdminReadLimiter,
  newsletterQueryGuard,
  getNewsletters
);

router.get(
  "/:id",
  authRequired,
  adminOnly,
  newsletterAdminReadLimiter,
  getNewsletter
);

router.patch(
  "/:id",
  authRequired,
  adminOnly,
  newsletterAdminWriteLimiter,
  csrfRequired,
  newsletterBodyGuard,
  updateNewsletter
);

router.delete(
  "/:id",
  authRequired,
  adminOnly,
  newsletterAdminWriteLimiter,
  csrfRequired,
  deleteNewsletter
);

export default router;