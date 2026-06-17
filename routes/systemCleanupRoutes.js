// routes/systemCleanupRoute.js

import express from "express";
import { cleanupDatabaseIndexes } from "../controllers/systemCleanupController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";
import { writeShield, allowMethods } from "../middleware/securityShield.js";

const router = express.Router();

router.post(
  "/database-indexes",
  allowMethods(["POST"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  cleanupDatabaseIndexes,
);

export default router;
