import express from "express";
import {
  getTestimonial,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonialController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import {
  testimonialCreateLimiter,
  testimonialsReadLimiter,
} from "../middleware/rateLimiters.js";
import { antiBot } from "../middleware/antiBotMiddleware.js";

const router = express.Router();

/**
 * PUBLIC (Frontend uses this to display testimonials)
 * ✅ add read limiter to reduce scraping/hammering
 */
router.get("/", testimonialsReadLimiter, getAllTestimonials);

/**
 * CREATE (Logged-in user)
 */
router.post(
  "/",
  authRequired,
  testimonialCreateLimiter,
  antiBot({ honeypotField: "website" }),
  createTestimonial
);

/**
 * ADMIN-ONLY CRUD
 */
router.get("/:id", authRequired, adminOnly, getTestimonial);
router.put("/:id", authRequired, adminOnly, updateTestimonial);
router.delete("/:id", authRequired, adminOnly, deleteTestimonial);

export default router;


