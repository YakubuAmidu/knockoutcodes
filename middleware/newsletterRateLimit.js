// middleware/newsletterRateLimit.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const jsonHandler = (message) => ({
  success: false,
  message,
});

const getEmailKey = (req) =>
  String(req.body?.email || "")
    .trim()
    .toLowerCase();

const buildLimiter = ({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,

    keyGenerator: (req) => {
      const ipKey = ipKeyGenerator(req.ip);
      const emailKey = getEmailKey(req);

      return emailKey ? `${ipKey}:${emailKey}` : ipKey;
    },

    message: jsonHandler(message),

    handler: (req, res, next, options) => {
      return res.status(options.statusCode).json(options.message);
    },
  });

export const newsletterSubscribeLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message:
    "Too many newsletter subscription attempts. Please try again later.",
});

export const newsletterAdminReadLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 180,
  message: "Too many admin read requests. Please slow down.",
});

export const newsletterAdminWriteLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 45,
  message: "Too many admin write attempts. Please try again later.",
});

export const newsletterSearchLimiter = buildLimiter({
  windowMs: 5 * 60 * 1000,
  max: 45,
  message: "Too many newsletter searches. Please wait a moment.",
});