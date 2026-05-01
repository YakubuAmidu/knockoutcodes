import express from "express";
import {
  createBlog,
  getBlogs,
  getBlog,
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

const router = express.Router();

// ✅ Public
router.get("/", getBlogs);
router.get("/:idOrSlug", validateIdOrSlugParam, getBlog);

// ✅ Admin only
router.post("/", authRequired, adminOnly, validateBlogBody, createBlog);

router.put(
  "/:id",
  authRequired,
  adminOnly,
  validateBlogIdParam,              // ✅ FIX: validate :id as ObjectId
  pickAllowedBlogUpdateFields,
  validateBlogBody,
  updateBlog
);

router.delete("/", authRequired, adminOnly, deleteAllBlogs);
router.delete("/:idOrSlug", authRequired, adminOnly, validateIdOrSlugParam, deleteBlog);

export default router;


