// routes/sessionRoutes.js
import express from "express";
import {
  listSessions,
  upsertCurrentSession,
  revokeSessionById,
  revokeOtherSessions,
  listAllSessionsAdmin,
  updateSessionTrustAdmin,
  revokeSessionAdmin,
  cleanupOldSessionsAdmin,
  deleteRevokedSessionAdmin,
} from "../controllers/sessionController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";
import { publicShield, writeShield } from "../middleware/securityShield.js";

const router = express.Router();

router.get("/", ...publicShield, authRequired, listSessions);

router.post(
  "/upsert",
  ...writeShield,
  csrfRequired,
  authRequired,
  upsertCurrentSession,
);

router.post(
  "/revoke-others",
  ...writeShield,
  csrfRequired,
  authRequired,
  revokeOtherSessions,
);

router.delete(
  "/others",
  ...writeShield,
  csrfRequired,
  authRequired,
  revokeOtherSessions,
);

router.get(
  "/admin",
  ...publicShield,
  authRequired,
  adminOnly,
  listAllSessionsAdmin,
);

router.patch(
  "/admin/:id/trust",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  updateSessionTrustAdmin,
);

router.delete(
  "/admin/cleanup",
  authRequired,
  adminOnly,
  cleanupOldSessionsAdmin,
);

router.delete(
  "/admin/:id/revoke",
  ...writeShield,
  csrfRequired,
  authRequired,
  adminOnly,
  revokeSessionAdmin,
);

router.delete(
  "/admin/:id/delete",
  authRequired,
  adminOnly,
  deleteRevokedSessionAdmin,
);

router.delete(
  "/:id",
  ...writeShield,
  csrfRequired,
  authRequired,
  revokeSessionById,
);

export default router;
