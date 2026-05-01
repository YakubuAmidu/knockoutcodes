import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";

// Use your existing auth middleware names:
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import { productPublicShield, productAdminShield } from "../middleware/productShield.js";
import { productWriteFirewall } from "../middleware/productWriteFirewall.js";
import validateObjectId from "../middleware/validateObjectId.js";
import safeSort from "../middleware/safeSort.js";

const router = express.Router();

// Public shop routes
router.get("/", ...productPublicShield, safeSort, getProducts);
router.get("/:id", ...productPublicShield, validateObjectId("id"), getProduct);

// Admin product management
router.post("/",
  ...productAdminShield,
  authRequired,
  adminOnly,
  productWriteFirewall,
  createProduct);
router.put("/:id",
  ...productAdminShield,
  validateObjectId("id"),
  authRequired,
  adminOnly,
  productWriteFirewall,
  updateProduct);
router.delete("/:id",
  ...productAdminShield,
  validateObjectId("id"),
  authRequired,
  adminOnly,
  deleteProduct);

export default router;
