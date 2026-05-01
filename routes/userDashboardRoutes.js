import express from "express";
import { getUserDashboard } from "../controllers/userDashboardController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/v1/dashboard?range=7d
 * Protected route: user must be logged in
 */
router.get("/", authRequired, getUserDashboard);

export default router;
