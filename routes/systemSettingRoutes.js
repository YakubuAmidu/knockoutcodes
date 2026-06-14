// routes/systemSettingRoutes.js

import express from "express";

import {
  getSystemStatus,
  getAdminSystemSettings,
  updateMaintenanceMode,
  deleteSystemSetting,
} from "../controllers/systemSettingController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";

import {
  publicShield,
  writeShield,
  allowMethods,
} from "../middleware/securityShield.js";

const router = express.Router();

router.get("/status", allowMethods(["GET"]), publicShield, getSystemStatus);

router.get(
  "/admin/settings",
  allowMethods(["GET"]),
  publicShield,
  authRequired,
  adminOnly,
  getAdminSystemSettings
);

router.put(
  "/maintenance",
  allowMethods(["PUT"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  updateMaintenanceMode
);

router.delete(
  "/admin/settings/:id",
  allowMethods(["DELETE"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  deleteSystemSetting
);

export default router;