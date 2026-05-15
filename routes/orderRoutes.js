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

const router = express.Router();

/**
 * Customer order creation
 * ✅ Logged-in users only
 * ❌ Admins blocked from placing customer orders
 */
router.post(
  "/",
  authRequired,
  preventAdminPurchase,
  createOrder
);

// User: get own orders
router.get("/my", authRequired, getMyOrders);

// Admin: get all orders
router.get("/", authRequired, adminOnly, getOrders);

router.get("/confirm-product", authRequired, confirmProductOrder);

// Admin: special order workflow actions
router.patch("/:id/seen", authRequired, adminOnly, markOrderAsSeen);
router.patch("/:id/fulfill", authRequired, adminOnly, fulfillOrder);
router.patch("/:id/cancel", authRequired, adminOnly, cancelOrder);
router.patch("/:id/refund", authRequired, adminOnly, refundOrder);
router.patch("/:id/tracking", authRequired, adminOnly, updateOrderTracking);

// User/Admin: get single order
router.get("/:id", authRequired, getOrder);

// Admin: update & delete order
router.put("/:id", authRequired, adminOnly, updateOrder);
router.delete("/:id", authRequired, adminOnly, deleteOrder);

export default router;

