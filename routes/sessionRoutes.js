// routes/sessionRoutes.js
import express from "express";
import {
  listSessions,
  upsertCurrentSession,
  revokeSessionById,
  revokeOtherSessions,
} from "../controllers/sessionController.js";

import { authRequired } from "../middleware/authMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";

import {
  publicShield,
  writeShield,
} from "../middleware/securityShield.js";

const router = express.Router();

/**
 * USER SESSION ROUTES
 * Mounted at: /api/v1/auth/sessions
 */

// Get my active devices/sessions
router.get("/", ...publicShield, authRequired, listSessions);

// Create/update current session after login or refresh
router.post(
  "/upsert",
  ...writeShield,
  csrfRequired,
  authRequired,
  upsertCurrentSession
);

// Revoke all other devices except current one
// ✅ this MUST come first
router.delete(
  "/others",
  csrfRequired,
  authRequired,
  revokeOtherSessions
);

// ✅ this MUST come after /others
router.delete(
  "/:id",
  csrfRequired,
  authRequired,
  revokeSessionById
);

export default router;