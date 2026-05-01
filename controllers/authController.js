// controllers/authController.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/UserModel.js";
import Session from "../models/SessionModel.js";
import { parseDeviceInfo } from "../utils/deviceInfo.js";

const LOGIN_MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// eslint-disable-next-line no-undef
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
// eslint-disable-next-line no-undef
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// eslint-disable-next-line no-undef
const JWT_ISSUER = process.env.JWT_ISSUER || "knockoutcodes-api";
// eslint-disable-next-line no-undef
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "knockoutcodes-web";

// -------------------- helpers --------------------

function getRefreshTokenFromRequest(req) {
  return req.cookies?.refreshToken || "";
}

function isProd() {
  // eslint-disable-next-line no-undef
  return process.env.NODE_ENV === "production";
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 min
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      typ: "access",
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: "15m",
    }
  );
}

function signRefreshToken(user, refreshTokenId) {
  return jwt.sign(
    {
      sub: String(user._id),
      rid: refreshTokenId,
      typ: "refresh",
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_REFRESH_SECRET,
    {
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: "7d",
    }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    avatar: user.avatar || "",
    phone: user.phone || "",
    location: user.location || "",
    website: user.website || "",
    instagram: user.instagram || "",
    tiktok: user.tiktok || "",
    youtube: user.youtube || "",
    xhandle: user.xhandle || "",
    bio: user.bio || "",
    headline: user.headline || "",
    notifications: user.notifications,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: user.loginCount || 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("accessToken", accessToken, accessCookieOptions());
  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie("accessToken", clearCookieOptions());
  res.clearCookie("refreshToken", clearCookieOptions());
}

function isLocked(user) {
  return !!(user.lockUntil && new Date(user.lockUntil).getTime() > Date.now());
}

// -------------------- controllers --------------------

/**
 * POST /api/v1/auth/register
 */
export async function register(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: safeUser(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("register error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockUntil +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    // Keep message generic
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled. Please contact support.",
      });
    }

    if (isLocked(user)) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked. Please try again later.",
      });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Success -> reset lock counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.loginCount = Number(user.loginCount || 0) + 1;

    const refreshTokenId = crypto.randomUUID();
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, refreshTokenId);
    const sessionKeyHash = hashToken(refreshToken);

// Extract basic device info
const userAgent = req.headers["user-agent"] || "";
const device = parseDeviceInfo(userAgent);

const clientIp =
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.headers["x-real-ip"] ||
  req.socket?.remoteAddress ||
  req.ip ||
  "";

const approxLocation =
  clientIp === "::1" || clientIp === "127.0.0.1"
    ? "Localhost / Your computer"
    : "Location lookup not connected yet";

await Session.create({
  user: user._id,
  sessionKeyHash,
  userAgent: device.userAgent,
  ip: clientIp,
  approxLocation,
  browser: device.browser,
  os: device.os,
  deviceName: device.deviceName,
  lastActiveAt: new Date(),
});

    user.refreshTokenId = refreshTokenId;
    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: safeUser(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("login error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
}

/**
 * POST /api/v1/auth/refresh
 */
export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload?.typ !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const userId = payload.sub;
    const refreshTokenId = payload.rid;

    if (!userId || !refreshTokenId) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(userId).select(
      "+refreshTokenHash +refreshTokenId +refreshTokenExpiresAt +tokenVersion"
    );

    if (!user || user.isActive === false) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid.",
      });
    }

    if (!user.refreshTokenHash || !user.refreshTokenId || !user.refreshTokenExpiresAt) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (user.refreshTokenId !== refreshTokenId) {
      clearAuthCookies(res);

      // Optional hard kill for suspicious session reuse
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Session is no longer valid.",
      });
    }

    if (new Date(user.refreshTokenExpiresAt).getTime() <= Date.now()) {
      clearAuthCookies(res);
      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    const incomingHash = hashToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      clearAuthCookies(res);

      // Strong response to suspected token tampering/reuse
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Session is no longer valid.",
      });
    }

    // Rotate refresh token
    const nextRefreshTokenId = crypto.randomUUID();
    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user, nextRefreshTokenId);

    user.refreshTokenId = nextRefreshTokenId;
    user.refreshTokenHash = hashToken(nextRefreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Revoke old session
// Revoke old session
await Session.findOneAndUpdate(
  {
    user: user._id,
    sessionKeyHash: hashToken(refreshToken),
    revokedAt: null,
  },
  {
    $set: {
      revokedAt: new Date(),
      revokedReason: "rotated",
      lastActiveAt: new Date(),
    },
  }
);

// Build clean device info for the NEW rotated session
const nextUserAgent = req.headers["user-agent"] || "";
const nextDevice = parseDeviceInfo(nextUserAgent);

// Create new rotated session
const nextClientIp =
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.headers["x-real-ip"] ||
  req.socket?.remoteAddress ||
  req.ip ||
  "";

const nextApproxLocation =
  nextClientIp === "::1" || nextClientIp === "127.0.0.1"
    ? "Localhost / Your computer"
    : "Location lookup not connected yet";

await Session.create({
  user: user._id,
  sessionKeyHash: hashToken(nextRefreshToken),
  userAgent: nextDevice.userAgent,
  ip: nextClientIp,
  approxLocation: nextApproxLocation,
  browser: nextDevice.browser,
  os: nextDevice.os,
  deviceName: nextDevice.deviceName,
  lastActiveAt: new Date(),
});

    await user.save();

    setAuthCookies(res, nextAccessToken, nextRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
    });
  } catch (error) {
    clearAuthCookies(res);

    if (error?.name !== "JsonWebTokenError" && error?.name !== "TokenExpiredError") {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV !== "production") {
        console.error("refresh error:", error);
      }
    }

    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
}

/**
 * POST /api/v1/auth/logout
 */
// controllers/authController.js
export async function logoutUser(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken || "";

    const cookieOptions = clearCookieOptions();

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);

      // Revoke matching session record
      await Session.findOneAndUpdate(
        {
          sessionKeyHash: refreshHash,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: "logout",
            lastActiveAt: new Date(),
          },
        }
      );

      // If token is valid enough to identify user, clear stored refresh fields
      try {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
          algorithms: ["HS256"],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        });

        const userId = payload?.sub;

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              refreshTokenHash: "",
              refreshTokenId: "",
              refreshTokenExpiresAt: null,
            },
          });
        }
      } catch {
        /* ignore invalid/expired refresh token during logout */
      }
    }

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("logout error:", error);
    }

    res.clearCookie("accessToken", clearCookieOptions());
    res.clearCookie("refreshToken", clearCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
};

/**
 * GET /api/v1/auth/me
 */
export async function me(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    const user = await User.findById(userId);
    if (!user || user.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    };

    return res.status(200).json({
      success: true,
      user: safeUser(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("getMe error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to load user profile.",
    });
  }
};

// Get Sessions
export async function getSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken ? hashToken(currentRefreshToken) : "";

    const sessions = await Session.find({
      user: userId,
      revokedAt: null,
    })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .select("_id deviceName browser os ip approxLocation createdAt lastActiveAt sessionKeyHash")
      .lean();

    const items = sessions.map((session) => {
  const isCurrent =
    !!currentSessionHash &&
    String(session.sessionKeyHash) === String(currentSessionHash);

  return {
    // Main ID used by frontend buttons
    id: session._id.toString(),
    _id: session._id,

    // Device display
    device: session.deviceName || "Device",
    deviceName: session.deviceName || "Device",
    browser: session.browser || "Unknown",
    os: session.os || "Unknown",

    // Security details
    ip: session.ip || "Not available",
    location: session.approxLocation || "Not available",
    approxLocation: session.approxLocation || "Not available",

    // Time details
    createdAt: session.createdAt || null,
    lastActiveAt: session.lastActiveAt || null,

    // Status flags
    isCurrent,
    isTrusted: !!session.isTrusted,
  };
});

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("getSessions error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions.",
    });
  }
};

// Revoke Session
export async function revokeSession(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.params.id;

    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken ? hashToken(currentRefreshToken) : "";

    const session = await Session.findOne({
      _id: sessionId,
      user: userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.revokedAt) {
      return res.status(400).json({
        success: false,
        message: "Session has already been revoked.",
      });
    }

    if (
      currentSessionHash &&
      String(session.sessionKeyHash) === String(currentSessionHash)
    ) {
      return res.status(400).json({
        success: false,
        message: "Use logout to end your current session.",
      });
    }

    session.revokedAt = new Date();
    session.revokedReason = "manual_revoke";
    session.lastActiveAt = new Date();

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Session revoked successfully.",
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("revokeSession error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to revoke session.",
    });
  }
}

// Revode Other Session
export async function revokeOtherSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken ? hashToken(currentRefreshToken) : "";

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
          revokedReason: "revoke_others",
          lastActiveAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Other sessions revoked successfully.",
      revokedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV !== "production") {
      console.error("revokeOtherSessions error:", error);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to revoke other sessions.",
    });
  }
};