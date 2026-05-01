// routes/checkoutRoutes.js
import express from "express";
import {
  createProductCheckoutSession,
  createCourseCheckoutSession
} from "../controllers/checkoutController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public checkout start (you can protect later if you want logged-in only)
router.post("/products", authRequired, createProductCheckoutSession);

// Course checkout (✅ Must be logged in)
router.post("/courses", authRequired, createCourseCheckoutSession);

export default router;
