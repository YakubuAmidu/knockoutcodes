// controllers/sessionController.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Session from "../models/SessionModel.js";
import User from "../models/UserModel.js";

// eslint-disable-next-line no-undef
const JWT_ISSUER = process.env.JWT_ISSUER || "knockoutcodes-api";
// eslint-disable-next-line no-undef
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "knockoutcodes-web";

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

function clean(value, max = 120) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseUA(userAgent = "") {
  const ua = String(userAgent || "");

  const browser = /Edg\/\d+/i.test(ua)
    ? "Edge"
    : /Chrome\/\d+/i.test(ua) && !/Edg\/\d+/i.test(ua)
      ? "Chrome"
      : /Firefox\/\d+/i.test(ua)
        ? "Firefox"
        : /Safari\/\d+/i.test(ua) && !/Chrome\/\d+/i.test(ua)
          ? "Safari"
          : "Unknown";

  const os = /Windows NT/i.test(ua)
    ? "Windows"
    : /Mac OS X/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/i.test(ua)
          ? "iOS"
          : "Unknown";

  const deviceName = /iPhone/i.test(ua)
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

function getCurrentJti(req) {
  const token = getRefreshCookie(req);
  // eslint-disable-next-line no-undef
  if (!token || !process.env.JWT_REFRESH_SECRET) return null;

  try {
    // eslint-disable-next-line no-undef
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
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
  } catch {
    return null;
  }
}

function getIp(req) {
  return clean(
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "",
    80,
  );
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

function adminSessionToClient(doc) {
  return {
    id: doc._id?.toString(),
    user: doc.user
      ? {
          id: doc.user._id?.toString(),
          name: doc.user.name || "Unknown",
          email: doc.user.email || "",
          role: doc.user.role || "user",
          isActive: doc.user.isActive !== false,
        }
      : null,
    deviceName: doc.deviceName || "Device",
    browser: doc.browser || "Unknown",
    os: doc.os || "Unknown",
    ip: doc.ip || "",
    approxLocation: doc.approxLocation || "",
    isTrusted: !!doc.isTrusted,
    lastActiveAt: doc.lastActiveAt,
    createdAt: doc.createdAt,
    revokedAt: doc.revokedAt,
    revokedReason: doc.revokedReason || "",
    status: doc.revokedAt ? "revoked" : "active",
  };
}

export async function listSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const currentJti = getCurrentJti(req);
    const currentSessionHash = currentJti ? hashKey(currentJti) : "";
    let currentSessionId = null;

    if (currentSessionHash) {
      const found = await Session.findOne({
        user: userId,
        sessionKeyHash: currentSessionHash,
        revokedAt: null,
      }).select("_id +sessionKeyHash");

      currentSessionId = found?._id?.toString() || null;
    }

    const active = await Session.find({
      user: userId,
      revokedAt: null,
    })
      .sort({ lastActiveAt: -1 })
      .limit(10)
      .lean();

    const sessions = active.map((session) =>
      toClientSession(session, currentSessionId),
    );

    return res.status(200).json({
      success: true,
      currentSessionId,
      sessions,
      data: sessions,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions.",
    });
  }
}

export async function upsertCurrentSession(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const jti = getCurrentJti(req);

    if (!jti) {
      return res.status(400).json({
        success: false,
        message: "Current device session could not be identified.",
      });
    }

    const ua = clean(req.headers["user-agent"] || "", 500);
    const { browser, os, deviceName } = parseUA(ua);
    const sessionKeyHash = hashKey(jti);

    const updated = await Session.findOneAndUpdate(
      { user: userId, sessionKeyHash },
      {
        $set: {
          userAgent: ua,
          ip: getIp(req),
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
      { new: true, upsert: true, runValidators: true },
    ).select("+sessionKeyHash");

    return res.status(200).json({
      success: true,
      currentSessionId: updated._id.toString(),
      session: toClientSession(updated),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update current session.",
    });
  }
}

export async function revokeSessionById(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session id." });
    }

    const currentJti = getCurrentJti(req);
    const currentHash = currentJti ? hashKey(currentJti) : "";

    const session = await Session.findOne({
      _id: id,
      user: userId,
      revokedAt: null,
    }).select("+sessionKeyHash");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    if (session.sessionKeyHash === currentHash) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot revoke your current session here. Use logout instead.",
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = "user_revoked_device";
    await session.save();

    return res.status(200).json({
      success: true,
      message: "Device signed out successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to revoke session.",
    });
  }
}

export async function revokeOtherSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const currentJti = getCurrentJti(req);
    const currentSessionHash = currentJti ? hashKey(currentJti) : "";

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
      },
      { runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Other devices signed out successfully.",
      revokedCount: result.modifiedCount || 0,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to sign out other devices.",
    });
  }
}

export async function listAllSessionsAdmin(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 5), 25);

    const status = clean(req.query.status || "active", 20);
    const trusted = clean(req.query.trusted || "", 10);
    const email = clean(req.query.email || "", 80).toLowerCase();

    const filter = {};

    if (status === "active") filter.revokedAt = null;
    if (status === "revoked") filter.revokedAt = { $ne: null };

    if (trusted === "true") filter.isTrusted = true;
    if (trusted === "false") filter.isTrusted = false;

    if (email) {
      const users = await User.find({
        email: { $regex: escapeRegex(email), $options: "i" },
      })
        .select("_id")
        .limit(100)
        .lean();

      filter.user = { $in: users.map((u) => u._id) };
    }

    const total = await Session.countDocuments(filter);
    const pages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, pages);
    const skip = (safePage - 1) * limit;

    const items = await Session.find(filter)
      .sort({ revokedAt: 1, lastActiveAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email role isActive")
      .lean();

    const counts = await Session.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$revokedAt", null] }, 1, 0],
            },
          },
          revoked: {
            $sum: {
              $cond: [{ $ne: ["$revokedAt", null] }, 1, 0],
            },
          },
          trusted: {
            $sum: {
              $cond: ["$isTrusted", 1, 0],
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      page: safePage,
      limit,
      total,
      pages,
      counts: counts[0] || { total: 0, active: 0, revoked: 0, trusted: 0 },
      items: items.map(adminSessionToClient),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin sessions.",
    });
  }
}

export async function updateSessionTrustAdmin(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session id." });
    }

    if (typeof req.body?.isTrusted !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isTrusted must be true or false.",
      });
    }

    const updated = await Session.findByIdAndUpdate(
      id,
      { $set: { isTrusted: req.body.isTrusted } },
      { new: true, runValidators: true },
    ).populate("user", "name email role isActive");

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    return res.status(200).json({
      success: true,
      message: req.body.isTrusted
        ? "Session marked trusted."
        : "Session marked untrusted.",
      item: adminSessionToClient(updated),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update session trust.",
    });
  }
}

export async function revokeSessionAdmin(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session id." });
    }

    const session = await Session.findById(id);

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    if (session.revokedAt) {
      return res.status(400).json({
        success: false,
        message: "Session is already revoked.",
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = "admin_revoked_session";
    await session.save();

    const populated = await Session.findById(id).populate(
      "user",
      "name email role isActive",
    );

    return res.status(200).json({
      success: true,
      message: "Session revoked by admin.",
      item: adminSessionToClient(populated),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to revoke session.",
    });
  }
}

export async function cleanupOldSessionsAdmin(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.body?.days || 30), 7), 365);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await Session.deleteMany({
      revokedAt: { $ne: null, $lt: cutoffDate },
    });

    return res.status(200).json({
      success: true,
      message: `Revoked sessions older than ${days} day(s) deleted.`,
      deletedCount: result.deletedCount || 0,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to cleanup old sessions.",
    });
  }
}

export async function deleteRevokedSessionAdmin(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id.",
      });
    }

    const deletedSession = await Session.findOneAndDelete({
      _id: id,
      revokedAt: { $ne: null },
    });

    if (!deletedSession) {
      return res.status(404).json({
        success: false,
        message: "Revoked session not found or it is still active.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Revoked session deleted from database successfully.",
      deletedId: deletedSession._id.toString(),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete revoked session.",
    });
  }
}
