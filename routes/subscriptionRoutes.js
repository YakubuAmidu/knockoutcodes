import express from "express";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";

import {
  createCheckoutSession,
  getMySubscription,
  confirmCheckoutSession,
  switchMembershipPlan,
  cancelMySubscription,
  stripeWebhook,

  getAllSubscriptionsAdmin,
  createSubscriptionAdmin,
  updateSubscriptionAdmin,
  deleteSubscriptionAdmin,
} from "../controllers/subscriptionController.js";

const router = express.Router();

router.get("/ping", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Subscription routes are working",
  });
});

router.post(
  "/checkout",
  authRequired,
  preventAdminPurchase,
  createCheckoutSession
);

router.get("/me", authRequired, getMySubscription);

router.get(
  "/admin/manage",
  authRequired,
  adminOnly,
  getAllSubscriptionsAdmin
);

router.post(
  "/admin/manage",
  authRequired,
  adminOnly,
  createSubscriptionAdmin
);

router.put(
  "/:id",
  authRequired,
  adminOnly,
  updateSubscriptionAdmin
);

router.delete(
  "/:id",
  authRequired,
  adminOnly,
  deleteSubscriptionAdmin
);

router.get("/confirm", authRequired, confirmCheckoutSession);

router.patch(
  "/switch",
  authRequired,
  preventAdminPurchase,
  switchMembershipPlan
);

router.patch("/cancel", authRequired, cancelMySubscription);

export default router;
export { stripeWebhook };