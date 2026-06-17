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
import {
  coachingJsonBody,
  enforceOrigin,
} from "../middleware/coachingHardening.js";
import { antiBot } from "../middleware/antiBotMiddleware.js";
import { requireCsrf } from "../middleware/csrfMiddleware.js";

import {
  requireJsonContent,
  adminRequestHardening,
  adminDeleteHardening,
} from "../middleware/requestHardening.js";

import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

/* =========================
   HEALTH CHECK
========================= */
router.get("/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    route: "coachings",
  });
});

/* =========================
   PUBLIC CREATE COACHING
========================= */
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
  createCoaching,
);

/* =========================
   ADMIN GET ALL COACHINGS
========================= */
router.get("/admin", authRequired, adminOnly, getAllCoachings);

/* =========================
   ADMIN GET SINGLE COACHING
========================= */
router.get(
  "/admin/:id",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  getCoachingById,
);

/* =========================
   ADMIN UPDATE COACHING
   - Status update
   - Session method update
   - Session link/phone/instructions update
   - Sends customer email from controller
========================= */
router.put(
  "/admin/:id",
  authRequired,
  adminOnly,
  requireJsonContent,
  ...adminRequestHardening,
  validateObjectId("id"),
  updateCoaching,
);

/* =========================
   ADMIN DELETE COACHING
========================= */
router.delete(
  "/admin/:id",
  authRequired,
  adminOnly,
  ...adminDeleteHardening,
  validateObjectId("id"),
  deleteCoaching,
);

export default router;
