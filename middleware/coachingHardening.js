import express from "express";

export const coachingJsonBody = express.json({ limit: "16kb" });

/**
 * FRONTEND_URL can be comma-separated:
 * FRONTEND_URL=http://localhost:5173,https://knockoutcodes.com
 */
export function enforceOrigin(req, res, next) {
  const allow = new Set(
    // eslint-disable-next-line no-undef
    String(process.env.FRONTEND_URL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  if (allow.size === 0) return next();

  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";

  if (!origin && !referer) return next();

  const originOk = origin && allow.has(origin);
  const refererOk =
    referer && Array.from(allow).some((base) => referer.startsWith(base));

  if (!originOk && !refererOk) {
    return res.status(403).json({
      success: false,
      message: "Blocked by origin policy.",
    });
  }

  next();
}