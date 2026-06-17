// routes/checkoutRoutes.js
import express from "express";
import {
  createProductCheckoutSession,
  createCourseCheckoutSession,
} from "../controllers/checkoutController.js";
import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Product checkout — logged-in users only, admins blocked
router.post(
  "/products",
  authRequired,
  preventAdminPurchase,
  createProductCheckoutSession,
);

// Course checkout (✅ Must be logged in)
router.post(
  "/courses",
  authRequired,
  preventAdminPurchase,
  createCourseCheckoutSession,
);

export default router;
