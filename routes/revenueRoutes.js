import express from "express";
import {
  getRevenueSummary,
  updateRevenueRecord,
  deleteRevenueRecord,
} from "../controllers/revenueController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/v1/admin/revenue
router.get("/", authRequired, adminOnly, getRevenueSummary);

// PATCH /api/v1/admin/revenue/:id
router.patch("/:id", authRequired, adminOnly, updateRevenueRecord);

// DELETE /api/v1/admin/revenue/:id
router.delete("/:id", authRequired, adminOnly, deleteRevenueRecord);

export default router;