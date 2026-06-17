// routes/planRoutes.js
import express from "express";
import {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan,
} from "../controllers/planController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: list plans (optionally filter ?active=true)
router.get("/", getPlans);

// Public: get single plan by id or slug
router.get("/:id", getPlan);

// Admin: create a plan
router.post("/", authRequired, adminOnly, createPlan);

// Admin: update a plan
router.put("/:id", authRequired, adminOnly, updatePlan);

// Admin: delete a plan
router.delete("/:id", authRequired, adminOnly, deletePlan);

export default router;
