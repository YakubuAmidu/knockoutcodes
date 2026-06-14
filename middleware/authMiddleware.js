// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/UserModel.js";

// Environment-driven JWT trust values
// eslint-disable-next-line no-undef
const JWT_ISSUER = process.env.JWT_ISSUER || "knockoutcodes-api";
// eslint-disable-next-line no-undef
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "knockoutcodes-web";
// eslint-disable-next-line no-undef
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

// Allow Bearer token in production only if explicitly enabled
const ALLOW_BEARER_IN_PROD =
  // eslint-disable-next-line no-undef
  String(process.env.ALLOW_BEARER_IN_PROD || "false") === "true";

function isProdEnv() {
  // eslint-disable-next-line no-undef
  return process.env.NODE_ENV === "production";
}

function logDevError(label, err) {
  if (!isProdEnv()) {
    console.error(`${label}:`, err?.message || err);
  }
}

/**
 * Build a consistent req.user shape for downstream handlers.
 */
function buildSafeRequestUser(source = {}) {
  return {
    _id: String(source._id || source.id || ""),
    id: String(source._id || source.id || ""),
    role: source.role || "user",
    tokenVersion: Number(source.tokenVersion ?? 0),
    isActive: source.isActive !== false,
  };
}

/**
 * Extract access token from:
 * - secure cookie first
 * - Bearer header second (only in non-prod, or if explicitly allowed in prod)
 */
function getAccessToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  const cookieToken = req.cookies?.accessToken || null;

  if (cookieToken) return cookieToken;

  if (!isProdEnv() || ALLOW_BEARER_IN_PROD) {
    return bearer || null;
  }

  return null;
}

/**
 * Verify and normalize access token payload.
 */
function verifyAccessToken(token) {
  if (!JWT_ACCESS_SECRET) {
    const err = new Error("JWT access secret is not configured.");
    err.statusCode = 500;
    throw err;
  }

  const payload = jwt.verify(token, JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (payload?.typ && payload.typ !== "access") {
    const err = new Error("Invalid token type.");
    err.statusCode = 401;
    throw err;
  }

  const userId = payload.sub || payload.id || payload._id;

  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    const err = new Error("Invalid token payload.");
    err.statusCode = 401;
    throw err;
  }

  return buildSafeRequestUser({
    _id: String(userId),
    role: payload.role || "user",
    tokenVersion: payload.tokenVersion ?? 0,
    isActive: true,
  });
}

/**
 * Require authenticated user.
 * Lightweight: trusts JWT after signature verification.
 * Does not hit DB on every request.
 */
export async function authRequired(req, res, next) {
  try {
    const token = getAccessToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const decoded = verifyAccessToken(token);

    // ✅ CRITICAL: Check DB (this is the upgrade)
    const user = await User.findById(decoded._id)
  .select(
    "_id role isActive tokenVersion isDeleted accountStatus statusReason"
  )
  .lean();

if (!user) {
  return res.status(401).json({
    success: false,
    message: "Account not found.",
  });
}

/* =========================
   ACCOUNT ACCESS RESTRICTED
========================= */
if (
  user.isDeleted === true ||
  user.isActive === false ||
  user.accountStatus !== "active"
) {
  return res.status(403).json({
    success: false,
    code: "ACCOUNT_ACCESS_RESTRICTED",
    message:
      user.statusReason ||
      `Your account is ${String(
        user.accountStatus || "restricted"
      ).replace(/_/g, " ")}.`,
    accountStatus: user.accountStatus || "restricted",
    statusReason: user.statusReason || "",
    redirectTo: "/account-access-notice",
  });
}

    // ✅ CRITICAL: Token version check (kills old sessions)
    if (Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: "Session invalid. Please log in again.",
      });
    }

    req.user = buildSafeRequestUser({
      _id: user._id,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
    });

    return next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    logDevError("authRequired error", err);

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }
}

/**
 * Optional auth:
 * attaches req.user when token is valid,
 * but does not block request when token is missing/invalid.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const token = getAccessToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded._id)
  .select("_id role isActive tokenVersion isDeleted accountStatus")
  .lean();

if (
  !user ||
  user.isDeleted === true ||
  user.isActive === false ||
  user.accountStatus !== "active"
) {
  req.user = null;
  return next();
}

    if (Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
      req.user = null;
      return next();
    }

    req.user = buildSafeRequestUser({
      _id: user._id,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
    });

    return next();
  } catch (err) {
    logDevError("optionalAuth error", err);
    req.user = null;
    return next();
  }
}

/**
 * Require admin user.
 * Uses DB as source of truth for role and active status.
 */
export async function adminOnly(req, res, next) {
  try {
    if (!req.user?._id || !mongoose.Types.ObjectId.isValid(String(req.user._id))) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(req.user._id)
      .select("_id role isActive")
      .lean();

    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

   if (!["admin", "superadmin"].includes(String(user.role))) {
  return res.status(403).json({
    success: false,
    message: "Admin access required.",
  });
}

    req.user = buildSafeRequestUser({
      _id: user._id,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: req.user.tokenVersion ?? 0,
    });

    return next();
  } catch (err) {
    logDevError("adminOnly error", err);

    return res.status(500).json({
      success: false,
      message: "Authorization check failed.",
    });
  }
}