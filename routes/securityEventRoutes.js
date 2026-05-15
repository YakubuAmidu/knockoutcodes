// routes/securityEventRoutes.js
import express from "express";
import {
  getSecurityEvents,
  updateSecurityEventReview,
  deleteSecurityEvent,
  deactivateUserFromSecurityEvent,
  blockIpFromSecurityEvent,
  deleteOldSecurityEvents,
  unblockIpFromSecurityEvent,
} from "../controllers/securityEventController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { publicShield, writeShield } from "../middleware/securityShield.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.get("/", ...publicShield, authRequired, adminOnly, getSecurityEvents);

router.patch(
  "/:id/review",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  updateSecurityEventReview
);

router.patch(
  "/:id/deactivate-user",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  deactivateUserFromSecurityEvent
);

router.patch(
  "/:id/block-ip",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  blockIpFromSecurityEvent
);

router.delete(
  "/cleanup",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  deleteOldSecurityEvents
);

router.delete(
  "/:id",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  deleteSecurityEvent
);

router.patch(
  "/:id/unblock-ip",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  unblockIpFromSecurityEvent
);

export default router;