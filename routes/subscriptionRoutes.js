import express from "express";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";
import { csrfRequired } from "../middleware/csrfMiddleware.js";
import { writeShield, allowMethods } from "../middleware/securityShield.js";

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
  allowMethods(["POST"]),
  writeShield,
  authRequired,
  preventAdminPurchase,
  csrfRequired,
  createCheckoutSession,
);

router.get("/me", authRequired, getMySubscription);

router.get("/confirm", authRequired, confirmCheckoutSession);

router.get("/admin/manage", authRequired, adminOnly, getAllSubscriptionsAdmin);

router.post(
  "/admin/manage",
  allowMethods(["POST"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  createSubscriptionAdmin,
);

router.put(
  "/:id",
  allowMethods(["PUT"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  updateSubscriptionAdmin,
);

router.delete(
  "/:id",
  allowMethods(["DELETE"]),
  writeShield,
  authRequired,
  adminOnly,
  csrfRequired,
  deleteSubscriptionAdmin,
);

router.patch(
  "/switch",
  allowMethods(["PATCH"]),
  writeShield,
  authRequired,
  preventAdminPurchase,
  csrfRequired,
  switchMembershipPlan,
);

router.patch(
  "/cancel",
  allowMethods(["PATCH"]),
  writeShield,
  authRequired,
  csrfRequired,
  cancelMySubscription,
);

export default router;
export { stripeWebhook };
