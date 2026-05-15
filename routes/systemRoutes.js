import express from "express";
import {
  getSystemStatus,
  updateMaintenanceMode,
} from "../controllers/systemSettingController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/status", getSystemStatus);

router.put(
  "/maintenance",
  authRequired,
  adminOnly,
  updateMaintenanceMode
);

export default router;