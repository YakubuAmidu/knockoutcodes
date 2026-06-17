// middleware/rateLimiters.js
import rateLimit from "express-rate-limit";

/**
 * Single source of truth for ALL rate limiters.
 * Safe defaults:
 * - standardHeaders=true => adds RateLimit-* headers
 * - legacyHeaders=false => disables X-RateLimit-* headers
 */

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

// ---------------------- AUTH ---------------------- //
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many refresh attempts. Please try again later.",
  },
});

// ------------------- COACHING -------------------- //
export const coachingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many coaching requests. Please try again in 15 minutes.",
    });
  },
});

// -------------------- CONTACT -------------------- //
// eslint-disable-next-line no-undef
const CONTACT_WINDOW_MS = parseInt(
  process.env.CONTACT_RATE_WINDOW_MS || "600000",
  10,
);
// eslint-disable-next-line no-undef
const CONTACT_MAX = parseInt(process.env.CONTACT_RATE_MAX || "5", 10);

export const contactCreateLimiter = rateLimit({
  windowMs: CONTACT_WINDOW_MS,
  max: CONTACT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many messages sent. Please try again in a few minutes.",
  },
});

export const challengeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// -------------------- REVIEWS -------------------- //
export const reviewCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many review attempts. Please try again later.",
  },
});

// ----------------- TESTIMONIALS ----------------- //
export const testimonialCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 testimonial submissions per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many testimonial submissions. Please try again later.",
  },
});

// ----------------- TESTIMONIALS (READ) ----------------- //
export const testimonialsReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120, // 120 reads/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

export default {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  coachingRateLimiter,
  contactCreateLimiter,
  challengeLimiter,
  reviewCreateLimiter,
  testimonialCreateLimiter,
  testimonialsReadLimiter,
};
