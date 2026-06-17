// routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getOrders,
  getMyOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  confirmProductOrder,
  markOrderAsSeen,
  fulfillOrder,
  cancelOrder,
  refundOrder,
  updateOrderTracking,
} from "../controllers/orderController.js";

import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

/* =========================================================
   🧾 CUSTOMER ORDER CREATION
   Logged-in users only.
   Admins are blocked from placing customer orders.
========================================================= */
router.post("/", authRequired, preventAdminPurchase, createOrder);

/* =========================================================
   👤 CUSTOMER PRIVATE ORDERS
   Must stay before "/:id".
========================================================= */
router.get("/my", authRequired, getMyOrders);

/* =========================================================
   ✅ PRODUCT CHECKOUT CONFIRMATION
   Stripe success page verifies payment + MongoDB order.
========================================================= */
router.get("/confirm-product", authRequired, confirmProductOrder);

/* =========================================================
   👑 ADMIN ORDER VAULT
   Admin can view all orders.
========================================================= */
router.get("/", authRequired, adminOnly, getOrders);

/* =========================================================
   👑 ADMIN WORKFLOW ACTIONS
   Every ":id" route validates MongoDB ObjectId first.
========================================================= */
router.patch(
  "/:id/seen",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  markOrderAsSeen,
);

router.patch(
  "/:id/fulfill",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  fulfillOrder,
);

router.patch(
  "/:id/cancel",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  cancelOrder,
);

router.patch(
  "/:id/refund",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  refundOrder,
);

router.patch(
  "/:id/tracking",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  updateOrderTracking,
);

/* =========================================================
   🔐 SINGLE ORDER VIEW
   Backend controller allows owner or admin only.
========================================================= */
router.get("/:id", authRequired, validateObjectId("id"), getOrder);

/* =========================================================
   👑 ADMIN UPDATE / DELETE
========================================================= */
router.put(
  "/:id",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  updateOrder,
);

router.delete(
  "/:id",
  authRequired,
  adminOnly,
  validateObjectId("id"),
  deleteOrder,
);

export default router;
