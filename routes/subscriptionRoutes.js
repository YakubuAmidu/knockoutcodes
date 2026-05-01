// routes/subscriptionRoutes.js
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  createCheckoutSession,
  getMySubscription,
  confirmCheckoutSession,
  stripeWebhook,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// normal routes
router.post("/checkout", authRequired, createCheckoutSession);
router.get("/me", authRequired, getMySubscription);
router.get("/confirm", authRequired, confirmCheckoutSession);

export default router;

// IMPORTANT: webhook route is mounted separately with express.raw in server.js
export { stripeWebhook };

