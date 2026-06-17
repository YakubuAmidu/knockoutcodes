// middleware/abuseProtection.js
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

/**
 * ✅ Slow down repeat requests (express-slow-down v2+)
 * NOTE: v2 removed header options, so DO NOT pass standardHeaders/legacyHeaders here.
 */
export const slowApi = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 60, // allow 60 requests/min before slowing
  delayMs: () => 200, // add 200ms per request after threshold
});

/**
 * ✅ Courses read limiter (protect scraping)
 */
export const coursesReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

/**
 * ✅ Checkout limiter (protect Stripe session spam)
 */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout attempts. Please try again later.",
  },
});
