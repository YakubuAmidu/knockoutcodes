// routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getOrders,
  getMyOrders,
  getOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// User: create order
router.post("/", authRequired, createOrder);

// User: get own orders
router.get("/my", authRequired, getMyOrders);

// Admin: get all orders
router.get("/", authRequired, adminOnly, getOrders);

// User/Admin: get single order
router.get("/:id", authRequired, getOrder);

// Admin: update & delete order
router.put("/:id", authRequired, adminOnly, updateOrder);
router.delete("/:id", authRequired, adminOnly, deleteOrder);

export default router;

