// controllers/sessionController.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "../models/SessionModel.js";
import mongoose from "mongoose";

// eslint-disable-next-line no-undef
const JWT_ISSUER = process.env.JWT_ISSUER || "knockoutcodes-api";
// eslint-disable-next-line no-undef
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "knockoutcodes-web";

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

/**
 * Small UA parser (no deps).
 * Upgrade later to ua-parser-js if you want more detail.
 */
function parseUA(userAgent = "") {
  const ua = String(userAgent || "");

  const isChrome = /Chrome\/\d+/i.test(ua) && !/Edg\/\d+/i.test(ua);
  const isEdge = /Edg\/\d+/i.test(ua);
  const isSafari = /Safari\/\d+/i.test(ua) && !/Chrome\/\d+/i.test(ua);
  const isFirefox = /Firefox\/\d+/i.test(ua);

  const browser = isEdge
    ? "Edge"
    : isChrome
    ? "Chrome"
    : isFirefox
    ? "Firefox"
    : isSafari
    ? "Safari"
    : "Unknown";

  const os =
    /Windows NT/i.test(ua)
      ? "Windows"
      : /Mac OS X/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : "Unknown";

  const deviceName =
    /iPhone/i.test(ua)
      ? "iPhone"
      : /iPad/i.test(ua)
      ? "iPad"
      : /Android/i.test(ua)
      ? "Android Device"
      : /Macintosh/i.test(ua)
      ? "Mac"
      : /Windows NT/i.test(ua)
      ? "Windows PC"
      : "Device";

  return { browser, os, deviceName };
}

/**
 * Extract refresh token from cookie.
 * Adjust names if your refresh cookie is different.
 */
function getRefreshCookie(req) {
  return (
    req.cookies?.refreshToken ||
    req.cookies?.refresh_token ||
    req.cookies?.jwtRefresh ||
    req.cookies?.refresh ||
    req.cookies?.jwt ||
    null
  );
}

/**
 * Verify refresh token and return its jti/sid (session id inside JWT).
 * Also enforces issuer/audience + token type, same as your access middleware style.
 */
function getCurrentJti(req) {
  const token = getRefreshCookie(req);
  if (!token) {
    console.log("NO REFRESH TOKEN FOUND");
    return null;
  }

  try {
    // eslint-disable-next-line no-undef
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    console.log("REFRESH TOKEN DECODED:", {
  userId: decoded?.sub,      // your user id is stored here
  refreshId: decoded?.rid,   // your refresh/session id is stored here
  typ: decoded?.typ,
  tokenVersion: decoded?.tokenVersion,
  aud: decoded?.aud,
  iss: decoded?.iss,
});

    if (decoded?.typ && decoded.typ !== "refresh") return null;

  return (
  decoded?.rid ||
  decoded?.jti ||
  decoded?.sid ||
  decoded?.sessionId ||
  decoded?.sessionKey ||
  null
);
  } catch (error) {
    console.log("REFRESH TOKEN VERIFY FAILED:", error.message);

    try {
      const decodedOnly = jwt.decode(token);
      console.log("REFRESH TOKEN DECODE ONLY:", decodedOnly);
    } catch {
      console.log("COULD NOT DECODE REFRESH TOKEN");
    }

    return null;
  }
}

function toClientSession(doc, currentSessionId = null) {
  const id = doc._id.toString();

  return {
    id,
    device: doc.deviceName || "Device",
    deviceName: doc.deviceName || "Device",
    browser: doc.browser || "Unknown",
    os: doc.os || "Unknown",
    ip: doc.ip || "",
    location: doc.approxLocation || "",
    approxLocation: doc.approxLocation || "",
    lastActiveAt: doc.lastActiveAt,
    createdAt: doc.createdAt,
    isTrusted: !!doc.isTrusted,
    isCurrent: currentSessionId ? id === currentSessionId : false,
  };
}

/**
 * GET /api/v1/sessions
 * Return all active sessions + currentSessionId (for UI badge).
 */
export async function listSessions(req, res) {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  const active = await Session.find({
    user: userId,
    revokedAt: null,
  }).sort({ lastActiveAt: -1 });

  const currentRefreshToken = getRefreshCookie(req);
const currentSessionHash = currentRefreshToken ? hashKey(currentRefreshToken) : "";

let currentSessionId = null;

if (currentSessionHash) {
  const found = await Session.findOne({
    user: userId,
    sessionKeyHash: currentSessionHash,
    revokedAt: null,
  }).select("_id");

  currentSessionId = found?._id?.toString() || null;
}

  const sessions = active.map((session) =>
    toClientSession(session, currentSessionId)
  );

  return res.status(200).json({
    success: true,
    currentSessionId,
    sessions,
    data: sessions,
  });
}

/**
 * POST /api/v1/sessions/upsert
 * Create/refresh the current session record.
 * Call this right after login/refresh token is set.
 */
export async function upsertCurrentSession(req, res) {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const jti = getCurrentJti(req);
  if (!jti) {
    return res.status(400).json({
      success: false,
      message:
        "Missing refresh token cookie. Cannot create device session without refresh token.",
    });
  }

  const ua = req.headers["user-agent"] || "";
  const { browser, os, deviceName } = parseUA(ua);

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";

  const sessionKeyHash = hashKey(jti);

  const updated = await Session.findOneAndUpdate(
    { user: userId, sessionKeyHash },
    {
      $set: {
        userAgent: String(ua),
        ip: String(ip),
        browser,
        os,
        deviceName,
        lastActiveAt: new Date(),
        revokedAt: null,
        revokedReason: "",
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  return res.status(200).json({
    success: true,
    currentSessionId: updated._id.toString(),
    session: toClientSession(updated),
  });
}

/**
 * DELETE /api/v1/sessions/:id
 * Revoke a specific session (not the current one).
 */
export async function revokeSessionById(req, res) {
  const userId = req.user?._id || req.user?.id;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid session id.",
    });
  }

  const currentJti = getCurrentJti(req);
  const currentHash = currentJti ? hashKey(currentJti) : "";

  const session = await Session.findOne({
    _id: id,
    user: userId,
    revokedAt: null,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found.",
    });
  }

  if (session.sessionKeyHash === currentHash) {
    return res.status(400).json({
      success: false,
      message: "You cannot revoke your current session here. Use logout instead.",
    });
  }

  session.revokedAt = new Date();
  session.revokedReason = "user_revoked_device";
  await session.save();

  return res.status(200).json({
    success: true,
    message: "Device signed out successfully.",
  });
}

/**
 * POST /api/v1/sessions/revoke-others
 * Revoke all sessions except the current one.
 */
export async function revokeOtherSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const currentRefreshToken = getRefreshCookie(req);
    const currentSessionHash = currentRefreshToken
      ? hashKey(currentRefreshToken)
      : "";

    if (!currentSessionHash) {
      return res.status(400).json({
        success: false,
        message: "Current session could not be identified.",
      });
    }

    const result = await Session.updateMany(
      {
        user: userId,
        revokedAt: null,
        sessionKeyHash: { $ne: currentSessionHash },
      },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: "user_revoked_others",
          lastActiveAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Other devices signed out successfully.",
      revokedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("revokeOtherSessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to sign out other devices.",
    });
  }
}