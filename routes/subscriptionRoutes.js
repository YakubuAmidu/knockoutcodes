// routes/subscriptionRoutes.js

import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";

import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";

import {
  createCheckoutSession,
  getMySubscription,
  confirmCheckoutSession,
  switchMembershipPlan,
  cancelMySubscription,
  stripeWebhook,
} from "../controllers/subscriptionController.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               SYSTEM HEALTH                                */
/* -------------------------------------------------------------------------- */

router.get("/ping", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Subscription routes are working",
  });
});

/* -------------------------------------------------------------------------- */
/*                         CUSTOMER MEMBERSHIP FLOW                           */
/* -------------------------------------------------------------------------- */

/**
 * Premium membership checkout
 * ✅ Logged-in users only
 * ❌ Admins blocked from becoming members
 */
router.post(
  "/checkout",
  authRequired,
  preventAdminPurchase,
  createCheckoutSession
);

/**
 * Get my current subscription
 * ✅ Logged-in users only
 */
router.get(
  "/me",
  authRequired,
  getMySubscription
);

/**
 * Confirm Stripe checkout session
 * ✅ Logged-in users only
 */
router.get(
  "/confirm",
  authRequired,
  confirmCheckoutSession
);

/**
 * Switch membership plan
 * ❌ Admins blocked
 */
router.patch(
  "/switch",
  authRequired,
  preventAdminPurchase,
  switchMembershipPlan
);

/**
 * Cancel my subscription
 */
router.patch(
  "/cancel",
  authRequired,
  cancelMySubscription
);

export default router;
export { stripeWebhook };