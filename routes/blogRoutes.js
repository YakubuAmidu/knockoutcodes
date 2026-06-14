import express from "express";

import {
  createBlog,
  getBlogs,
  getBlog,
  likeBlog,
  unlikeBlog,
  updateBlog,
  deleteBlog,
  deleteAllBlogs,
} from "../controllers/blogController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

import {
  validateBlogBody,
  pickAllowedBlogUpdateFields,
  validateBlogIdParam,
  validateIdOrSlugParam,
} from "../middleware/blogSecurityMiddleware.js";

import {
  publicShield,
  writeShield,
  allowMethods,
} from "../middleware/securityShield.js";

const router = express.Router();

/* =========================
   PUBLIC BLOGS
========================= */
router.get(
  "/",
  allowMethods(["GET"]),
  publicShield,
  getBlogs
);

router.get(
  "/:idOrSlug",
  allowMethods(["GET"]),
  publicShield,
  validateIdOrSlugParam,
  getBlog
);

/* =========================
   USER ENGAGEMENT
========================= */
router.patch(
  "/:idOrSlug/like",
  allowMethods(["PATCH"]),
  writeShield,
  authRequired,
  validateIdOrSlugParam,
  likeBlog
);

router.patch(
  "/:idOrSlug/unlike",
  allowMethods(["PATCH"]),
  writeShield,
  authRequired,
  validateIdOrSlugParam,
  unlikeBlog
);

/* =========================
   ADMIN BLOG MANAGEMENT
========================= */
router.post(
  "/",
  allowMethods(["POST"]),
  writeShield,
  authRequired,
  adminOnly,
  validateBlogBody,
  createBlog
);

router.put(
  "/:id",
  allowMethods(["PUT"]),
  writeShield,
  authRequired,
  adminOnly,
  validateBlogIdParam,
  pickAllowedBlogUpdateFields,
  validateBlogBody,
  updateBlog
);

router.delete(
  "/",
  allowMethods(["DELETE"]),
  writeShield,
  authRequired,
  adminOnly,
  deleteAllBlogs
);

router.delete(
  "/:idOrSlug",
  allowMethods(["DELETE"]),
  writeShield,
  authRequired,
  adminOnly,
  validateIdOrSlugParam,
  deleteBlog
);

export default router;