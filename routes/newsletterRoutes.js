// routes/newsletterRoutes.js
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
  newsletterAdminBodyGuard,
  newsletterQueryGuard,
} from "../middleware/newsletterMiddleware.js";

import {
  newsletterSubscribeLimiter,
  newsletterAdminReadLimiter,
  newsletterAdminWriteLimiter,
} from "../middleware/newsletterRateLimit.js";

import { csrfRequired } from "../middleware/csrfMiddleware.js";

const router = express.Router();

/* =========================
   PUBLIC: Subscribe
   ✅ Public visitors can subscribe
========================= */
router.post(
  "/",
  newsletterSubscribeLimiter,
  csrfRequired,
  newsletterBodyGuard,
  createNewsletter
);

/* =========================
   ADMIN: Read subscribers
========================= */
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

/* =========================
   ADMIN: Update subscriber
========================= */
router.patch(
  "/:id",
  authRequired,
  adminOnly,
  newsletterAdminWriteLimiter,
  csrfRequired,
  newsletterAdminBodyGuard,
  updateNewsletter
);

/* =========================
   ADMIN: Delete subscriber
========================= */
router.delete(
  "/:id",
  authRequired,
  adminOnly,
  newsletterAdminWriteLimiter,
  csrfRequired,
  deleteNewsletter
);

export default router;