// middleware/productShield.js

import rateLimit from "express-rate-limit";
import { noSqlShield, allowOnlyProductQueryKeys } from "./noSqlShield.js";
import { publicRequestHardening, adminRequestHardening } from "./requestHardening.js";

/**
 * Tiny helper to get a stable client identifier:
 * - Prefer X-Forwarded-For (when behind a proxy like Render/Heroku/Nginx)
 * - Fall back to req.ip
 */
function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip;
}

/**
 * Method guard:
 * - Ensures you don't accidentally apply public/admin shields to unexpected methods
 * - Helps keep middleware packs "self-documenting" and safer to reuse
 */
function allowMethods(methods = ["GET"]) {
  const allow = methods.map((m) => String(m).toUpperCase());
  return (req, res, next) => {
    const m = String(req.method || "GET").toUpperCase();
    if (!allow.includes(m)) {
      return res.status(405).json({
        success: false,
        message: "Method not allowed.",
      });
    }
    next();
  };
}

/**
 * Basic bot / scanner guard.
 * Goal: block obvious non-browser scanners & bad clients early.
 * This is NOT "bot detection AI" — it's practical protection.
 */
export function botGuard(req, res, next) {
  const uaRaw = req.headers["user-agent"];
  const ua = String(uaRaw || "").toLowerCase();

  // ✅ 1) Block requests with no user-agent (common in scripts/scanners)
  // Keep as a hard block, but only if it's truly missing/empty.
  if (!ua || ua.trim().length < 3) {
    return res.status(403).json({ success: false, message: "Blocked client." });
  }

  // ✅ 2) Block extremely suspicious user-agents (basic noisy scanners)
  const badUAs = ["curl", "wget", "python-requests", "httpclient", "scrapy"];
  if (badUAs.some((x) => ua.includes(x))) {
    return res.status(403).json({ success: false, message: "Blocked client." });
  }

  // ✅ 3) For GETs, require an Accept header that looks like normal traffic
  // NOTE: some tools send no Accept; allow empty in prod apps to avoid false blocks.
  if (String(req.method || "GET").toUpperCase() === "GET") {
    const accept = String(req.headers["accept"] || "").toLowerCase();

    // If accept is missing, do NOT block — browsers sometimes omit it via fetch clients.
    // Only block if it's present and obviously weird.
    if (accept && !(accept.includes("text/html") || accept.includes("application/json") || accept.includes("*/*"))) {
      return res.status(403).json({ success: false, message: "Suspicious request." });
    }
  }

  return next();
}

/**
 * Public products rate limit (prevents scraping & spam).
 * Keep it generous enough for real users, strict enough for bots.
 */
export const productsReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per client (public shop browsing)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    return `${ip}::${ua}`;
  },
  message: {
    success: false,
    message: "Too many requests. Slow down and try again.",
  },
});

/**
 * Admin write rate limit (prevents brute force create/update/delete attempts)
 * Very strict because only admins should do this.
 */
export const productsWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 60 write attempts per 10 minutes per client
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const ua = String(req.headers["user-agent"] || "");
    return `${ip}::${ua}`;
  },
  message: {
    success: false,
    message: "Too many write attempts. Try again later.",
  },
});

/**
 * Reusable middleware packs (so you don’t repeat yourself)
 *
 * ✅ Added allowMethods:
 * - Public shield should only be used on GET (list + details)
 * - Admin shield should only be used on write methods
 */
export const productPublicShield = [
  allowMethods(["GET"]),
  ...publicRequestHardening,
  botGuard,
  noSqlShield,
  allowOnlyProductQueryKeys,
  productsReadLimiter,
];

export const productAdminShield = [
  allowMethods(["POST", "PUT", "PATCH", "DELETE"]),
  ...adminRequestHardening,
  botGuard,
  noSqlShield,
  productsWriteLimiter,
];
