import express from "express";

import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import {
  productPublicShield,
  productAdminWriteShield,
  productAdminDeleteShield,
} from "../middleware/productShield.js";
import { productWriteFirewall } from "../middleware/productWriteFirewall.js";
import validateObjectId from "../middleware/validateObjectId.js";
import safeSort from "../middleware/safeSort.js";

const router = express.Router();

router.get(
  "/admin/manage",
  ...productPublicShield,
  authRequired,
  adminOnly,
  safeSort,
  getProducts
);

router.get("/", ...productPublicShield, safeSort, getProducts);

router.post(
  "/",
  ...productAdminWriteShield,
  authRequired,
  adminOnly,
  productWriteFirewall,
  createProduct
);

router.put(
  "/:id",
  ...productAdminWriteShield,
  authRequired,
  adminOnly,
  validateObjectId("id"),
  productWriteFirewall,
  updateProduct
);

router.delete(
  "/:id",
  ...productAdminDeleteShield,
  authRequired,
  adminOnly,
  validateObjectId("id"),
  deleteProduct
);

router.get("/:idOrSlug", ...productPublicShield, getProduct);

export default router;