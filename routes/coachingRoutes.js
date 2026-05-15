// routes/coachingRoutes.js
import express from "express";
import {
  createCoaching,
  getAllCoachings,
  getCoachingById,
  updateCoaching,
  deleteCoaching,
} from "../controllers/coachingController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { coachingRateLimiter } from "../middleware/rateLimiters.js";
import { coachingJsonBody, enforceOrigin } from "../middleware/coachingHardening.js";
import { antiBot } from "../middleware/antiBotMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, route: "coachings" });
});

// PUBLIC FORM — protected but still public
router.post(
  "/",
  coachingJsonBody,
  requireJsonContent,
  enforceOrigin,
  requireCsrf,
  coachingRateLimiter,
  antiBot({
    honeypotFields: ["website", "nickName"],
    textFields: ["goals"],
    nameFields: ["fullName"],
  }),
  createCoaching
);

// ADMIN ROUTES
router.get(
  "/admin",
  authRequired,
  adminOnly,
  getAllCoachings
);

router.get(
  "/admin/:id",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  getCoachingById
);

router.put(
  "/admin/:id",
  authRequired,
  adminOnly,
  ...adminRequestHardening,
  validateObjectId("id"),
  updateCoaching
);

router.delete(
  "/admin/:id",
  authRequired,
  adminOnly,
  ...adminDeleteHardening,
  validateObjectId("id"),
  deleteCoaching
);

export default router;