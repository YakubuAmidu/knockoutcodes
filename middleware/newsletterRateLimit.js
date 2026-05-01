// middleware/newsletterRateLimiter.js
import rateLimit from "express-rate-limit";

export const newsletterSubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many newsletter attempts. Please try again later.",
  },
});

export const newsletterAdminReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

export const newsletterAdminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many write attempts. Please try again later.",
  },
});