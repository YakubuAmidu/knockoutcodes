// routes/revenueRoutes.js
import express from "express";
import { getRevenueSummary } from "../controllers/revenueController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/v1/admin/revenue
router.get(
  "/",
  authRequired,
  adminOnly,
  getRevenueSummary
);

export default router;

