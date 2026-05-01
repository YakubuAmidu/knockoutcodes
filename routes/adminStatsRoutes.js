// routes/adminStatsRoutes.js
import express from "express";
import { getAdminStats } from "../controllers/adminStatsController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", authRequired, adminOnly, getAdminStats);

export default router;
