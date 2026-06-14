import express from "express";
import {
  getTestimonial,
  getAllTestimonials,
  getAllTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial,
} from "../controllers/testimonialController.js";
import { preventAdminPurchase } from "../middleware/preventAdminPurchase.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import {
  testimonialCreateLimiter,
  testimonialsReadLimiter,
} from "../middleware/rateLimiters.js";
import { antiBot } from "../middleware/antiBotMiddleware.js";

const router = express.Router();

router.get("/", testimonialsReadLimiter, getAllTestimonials);

router.get("/admin", authRequired, adminOnly, getAllTestimonialsAdmin);

router.post(
  "/",
  authRequired,
  preventAdminPurchase,
  testimonialCreateLimiter,
  antiBot({ honeypotField: "website" }),
  createTestimonial
);

router.get("/:id", authRequired, adminOnly, getTestimonial);
router.put("/:id", authRequired, adminOnly, updateTestimonial);
router.patch("/:id/approve", authRequired, adminOnly, approveTestimonial);
router.delete("/:id", authRequired, adminOnly, deleteTestimonial);

export default router;