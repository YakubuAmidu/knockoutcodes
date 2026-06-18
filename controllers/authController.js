// controllers/authController.js
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";
import User from "../models/UserModel.js";
import Session from "../models/SessionModel.js";
import { parseDeviceInfo } from "../utils/deviceInfo.js";
import { logSecurityEvent } from "../utils/securityLogger.js";

const LOGIN_MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

// eslint-disable-next-line no-undef
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
// eslint-disable-next-line no-undef
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// eslint-disable-next-line no-undef
const JWT_ISSUER = process.env.JWT_ISSUER || "knockoutcodes-api";
// eslint-disable-next-line no-undef
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "knockoutcodes-web";

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return { rawToken, hashedToken: hashToken(rawToken) };
}

function createEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return { rawToken, hashedToken: hashToken(rawToken) };
}

function isStrongPassword(password = "") {
  const value = String(password || "");
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

function isProd() {
  // eslint-disable-next-line no-undef
  return process.env.NODE_ENV === "production";
}

function getRefreshTokenFromRequest(req) {
  return req.cookies?.refreshToken || "";
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
    maxAge: 15 * 60 * 1000,
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
  if (!JWT_ACCESS_SECRET)
    throw new Error("JWT_ACCESS_SECRET is not configured.");

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
    },
  );
}

function signRefreshToken(user, refreshTokenId) {
  if (!JWT_REFRESH_SECRET)
    throw new Error("JWT_REFRESH_SECRET is not configured.");

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
    },
  );
}

function safeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: !!user.isEmailVerified,
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

function getLockMsRemaining(user) {
  if (!user?.lockUntil) return 0;
  return Math.max(new Date(user.lockUntil).getTime() - Date.now(), 0);
}

function getLockMinutesRemaining(user) {
  return Math.max(1, Math.ceil(getLockMsRemaining(user) / 60000));
}

async function clearExpiredLoginLock(user) {
  if (!user?.lockUntil) return false;

  const lockTime = new Date(user.lockUntil).getTime();

  if (Number.isNaN(lockTime) || lockTime <= Date.now()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save({ validateBeforeSave: false });
    return true;
  }

  return false;
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
}

function getApproxLocation(ip) {
  return ip === "::1" || ip === "127.0.0.1"
    ? "Localhost / Your computer"
    : "Location lookup not connected yet";
}

function formatAccountStatus(status = "disabled") {
  return String(status || "disabled").replace(/_/g, " ");
}

function getAccountAccessMessage(user) {
  const status = user?.accountStatus || "disabled";
  const reason = String(user?.statusReason || "").trim();

  if (reason) return reason;

  return `Your account is ${formatAccountStatus(
    status,
  )}. Please contact support if you believe this is a mistake.`;
}

function sendAccountAccessBlocked(res, user) {
  clearAuthCookies(res);

  return res.status(403).json({
    success: false,
    code: "ACCOUNT_ACCESS_RESTRICTED",
    message: getAccountAccessMessage(user),
    accountStatus: user?.accountStatus || "disabled",
    statusReason: user?.statusReason || "",
    userId: user?._id,
    redirectTo: "/account-access-notice",
  });
}

/**
 * POST /api/v1/auth/register
 */
export async function register(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || password);

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters.",
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    const { hashedToken } = createEmailVerificationToken();

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "REGISTER_SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      user: safeUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Registration failed." });
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +lockUntil +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt +emailVerificationToken +emailVerificationExpires +mfaEnabled +mfaSecret +mfaBackupCodes",
    );

    if (!user) {
      await logSecurityEvent(req, {
        email,
        type: "LOGIN_FAILED",
        meta: { reason: "USER_NOT_FOUND" },
      });

      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    if (
      user.isDeleted === true ||
      user.isActive === false ||
      user.accountStatus !== "active"
    ) {
      await logSecurityEvent(req, {
        user: user._id,
        email: user.email,
        type: "LOGIN_BLOCKED_ACCOUNT_STATUS",
        meta: {
          accountStatus: user.accountStatus || "disabled",
          reason: user.statusReason || "",
        },
      });

      return sendAccountAccessBlocked(res, user);
    }

    if (
      user.isEmailVerified === false &&
      user.emailVerificationToken &&
      user.emailVerificationExpires
    ) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    await clearExpiredLoginLock(user);

    if (isLocked(user)) {
      const minutesRemaining = getLockMinutesRemaining(user);

      return res.status(423).json({
        success: false,
        code: "ACCOUNT_LOCKED",
        message: `Account temporarily locked. Please try again in ${minutesRemaining} minute${
          minutesRemaining === 1 ? "" : "s"
        }.`,
        lockUntil: user.lockUntil,
        retryAfterSeconds: Math.ceil(getLockMsRemaining(user) / 1000),
      });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date();

      const shouldLock = user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS;

      if (shouldLock) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }

      await user.save({ validateBeforeSave: false });

      await logSecurityEvent(req, {
        user: user._id,
        email: user.email,
        type: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        meta: {
          failedLoginAttempts: user.failedLoginAttempts,
          lockUntil: shouldLock ? user.lockUntil : null,
        },
      });

      if (shouldLock) {
        const minutesRemaining = getLockMinutesRemaining(user);

        return res.status(423).json({
          success: false,
          code: "ACCOUNT_LOCKED",
          message: `Account temporarily locked because of too many failed login attempts. Please try again in ${minutesRemaining} minute${
            minutesRemaining === 1 ? "" : "s"
          }.`,
          lockUntil: user.lockUntil,
          retryAfterSeconds: Math.ceil(getLockMsRemaining(user) / 1000),
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.mfaEnabled) {
      const mfaToken = String(
        req.body?.mfaToken || req.body?.twoFactorCode || req.body?.token || "",
      )
        .replace(/\s+/g, "")
        .trim();

      if (!mfaToken) {
        return res.status(401).json({
          success: false,
          code: "MFA_REQUIRED",
          message: "Enter your authenticator code to continue.",
          mfaRequired: true,
        });
      }

      let mfaOk = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: "base32",
        token: mfaToken,
        window: 1,
      });

      if (!mfaOk && Array.isArray(user.mfaBackupCodes)) {
        for (const backup of user.mfaBackupCodes) {
          if (backup?.usedAt || !backup?.codeHash) continue;

          const backupOk = await bcrypt.compare(mfaToken, backup.codeHash);

          if (backupOk) {
            backup.usedAt = new Date();
            mfaOk = true;
            await user.save({ validateBeforeSave: false });
            break;
          }
        }
      }

      if (!mfaOk) {
        return res.status(401).json({
          success: false,
          code: "MFA_INVALID",
          message: "Invalid authenticator or backup code.",
          mfaRequired: true,
        });
      }
    }

    const refreshTokenId = crypto.randomUUID();
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, refreshTokenId);

    const userAgent = req.headers["user-agent"] || "";
    const device = parseDeviceInfo(userAgent);
    const clientIp = getClientIp(req);

    await Session.create({
      user: user._id,
      sessionKeyHash: hashToken(refreshToken),
      userAgent: device.userAgent,
      ip: clientIp,
      approxLocation: getApproxLocation(clientIp),
      browser: device.browser,
      os: device.os,
      deviceName: device.deviceName,
      lastActiveAt: new Date(),
    });

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.loginCount = Number(user.loginCount || 0) + 1;
    user.lastLoginIp = clientIp;
    user.lastLoginUserAgent = userAgent;
    user.refreshTokenId = refreshTokenId;
    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "LOGIN_SUCCESS",
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: safeUser(user),
      accessToken,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Login failed." });
  }
}

/**
 * POST /api/v1/auth/refresh
 */
export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload?.typ !== "refresh") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token." });
    }

    const userId = payload.sub;
    const refreshTokenId = payload.rid;

    if (!userId || !refreshTokenId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token." });
    }

    const user = await User.findById(userId).select(
      "+refreshTokenHash +refreshTokenId +refreshTokenExpiresAt +tokenVersion",
    );

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (
      user.isDeleted === true ||
      user.isActive === false ||
      user.accountStatus !== "active"
    ) {
      return sendAccountAccessBlocked(res, user);
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ success: false, message: "Session is no longer valid." });
    }

    if (
      !user.refreshTokenHash ||
      !user.refreshTokenId ||
      !user.refreshTokenExpiresAt
    ) {
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    if (user.refreshTokenId !== refreshTokenId) {
      clearAuthCookies(res);

      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;

      await Session.updateMany(
        { user: user._id, revokedAt: null },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: "refresh_token_reuse_detected",
            lastActiveAt: new Date(),
          },
        },
      );

      await user.save({ validateBeforeSave: false });

      await logSecurityEvent(req, {
        user: user._id,
        email: user.email,
        type: "REFRESH_TOKEN_REUSE_DETECTED",
        meta: {
          reason: "REFRESH_TOKEN_ID_MISMATCH",
        },
      });

      return res.status(401).json({
        success: false,
        message: "Session security issue detected. Please log in again.",
        code: "REFRESH_TOKEN_REUSE_DETECTED",
      });
    }

    if (new Date(user.refreshTokenExpiresAt).getTime() <= Date.now()) {
      clearAuthCookies(res);

      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;
      await user.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    if (hashToken(refreshToken) !== user.refreshTokenHash) {
      clearAuthCookies(res);

      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      user.refreshTokenHash = "";
      user.refreshTokenId = "";
      user.refreshTokenExpiresAt = null;

      await Session.updateMany(
        { user: user._id, revokedAt: null },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: "refresh_token_hash_mismatch",
            lastActiveAt: new Date(),
          },
        },
      );

      await user.save({ validateBeforeSave: false });

      await logSecurityEvent(req, {
        user: user._id,
        email: user.email,
        type: "REFRESH_TOKEN_REUSE_DETECTED",
        meta: {
          reason: "REFRESH_TOKEN_HASH_MISMATCH",
        },
      });

      return res.status(401).json({
        success: false,
        message: "Session security issue detected. Please log in again.",
        code: "REFRESH_TOKEN_REUSE_DETECTED",
      });
    }

    const nextRefreshTokenId = crypto.randomUUID();
    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user, nextRefreshTokenId);

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
      },
    );

    const nextUserAgent = req.headers["user-agent"] || "";
    const nextDevice = parseDeviceInfo(nextUserAgent);
    const nextClientIp = getClientIp(req);

    await Session.create({
      user: user._id,
      sessionKeyHash: hashToken(nextRefreshToken),
      userAgent: nextDevice.userAgent,
      ip: nextClientIp,
      approxLocation: getApproxLocation(nextClientIp),
      browser: nextDevice.browser,
      os: nextDevice.os,
      deviceName: nextDevice.deviceName,
      lastActiveAt: new Date(),
    });

    user.refreshTokenId = nextRefreshTokenId;
    user.refreshTokenHash = hashToken(nextRefreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "REFRESH_SUCCESS",
    });

    setAuthCookies(res, nextAccessToken, nextRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
    });
  } catch {
    clearAuthCookies(res);

    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logoutUser(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken || "";

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);

      await Session.findOneAndUpdate(
        { sessionKeyHash: refreshHash, revokedAt: null },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: "logout",
            lastActiveAt: new Date(),
          },
        },
      );

      try {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
          algorithms: ["HS256"],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        });

        if (payload?.sub) {
          await User.findByIdAndUpdate(payload.sub, {
            $set: {
              refreshTokenHash: "",
              refreshTokenId: "",
              refreshTokenExpiresAt: null,
            },
          });

          await logSecurityEvent(req, {
            user: payload.sub,
            type: "LOGOUT",
          });
        }
      } catch {
        /* ignore invalid/expired refresh token during logout */
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch {
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function me(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      user.isDeleted === true ||
      user.isActive === false ||
      user.accountStatus !== "active"
    ) {
      return sendAccountAccessBlocked(res, user);
    }

    return res.status(200).json({
      success: true,
      user: safeUser(user),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load user profile.",
    });
  }
}

/**
 * GET sessions
 */
export async function getSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken
      ? hashToken(currentRefreshToken)
      : "";

    const sessions = await Session.find({ user: userId, revokedAt: null })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .select(
        "_id deviceName browser os ip approxLocation createdAt lastActiveAt sessionKeyHash isTrusted",
      )
      .lean();

    const items = sessions.map((session) => {
      const isCurrent =
        !!currentSessionHash &&
        String(session.sessionKeyHash) === String(currentSessionHash);

      return {
        id: session._id.toString(),
        _id: session._id,
        device: session.deviceName || "Device",
        deviceName: session.deviceName || "Device",
        browser: session.browser || "Unknown",
        os: session.os || "Unknown",
        ip: session.ip || "Not available",
        location: session.approxLocation || "Not available",
        approxLocation: session.approxLocation || "Not available",
        createdAt: session.createdAt || null,
        lastActiveAt: session.lastActiveAt || null,
        isCurrent,
        isTrusted: !!session.isTrusted,
      };
    });

    return res.status(200).json({ success: true, items });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions.",
    });
  }
}

/**
 * Revoke one session
 */
export async function revokeSession(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.params.id;
    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken
      ? hashToken(currentRefreshToken)
      : "";

    const session = await Session.findOne({ _id: sessionId, user: userId });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    if (session.revokedAt) {
      return res
        .status(400)
        .json({ success: false, message: "Session has already been revoked." });
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to revoke session.",
    });
  }
}

/**
 * Revoke other sessions
 */
export async function revokeOtherSessions(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const currentRefreshToken = getRefreshTokenFromRequest(req);
    const currentSessionHash = currentRefreshToken
      ? hashToken(currentRefreshToken)
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
          revokedReason: "revoke_others",
          lastActiveAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Other sessions revoked successfully.",
      revokedCount: result.modifiedCount || 0,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to revoke other sessions.",
    });
  }
}

/**
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const genericMessage =
      "If that email exists, a password reset link has been sent.";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetToken +passwordResetExpires",
    );

    if (!user || user.isActive === false) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const { rawToken, hashedToken } = createPasswordResetToken();

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    const frontendUrl =
      // eslint-disable-next-line no-undef
      process.env.FRONTEND_URL ||
      // eslint-disable-next-line no-undef
      process.env.CLIENT_URL ||
      "https://silver-pasca-64a87c.netlify.app";

    const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password/${rawToken}`;

    await sendMail({
      to: user.email,
      subject: "Reset your KnockoutCodes password",
      text: `Reset your password using this link: ${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.`,
      html: `
    <div style="font-family:Arial,sans-serif;line-height:1.6;">
      <h2>Reset your password</h2>
      <p>Click the button below to reset your KnockoutCodes password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `,
    });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "FORGOT_PASSWORD_REQUEST",
    });

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request.",
    });
  }
}

/**
 * PATCH /api/v1/auth/reset-password/:token
 */
export async function resetPassword(req, res) {
  try {
    const rawToken = String(req.params?.token || "").trim();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!rawToken || rawToken.length < 32) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid, expired, or already used.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    const hashedToken = hashToken(rawToken);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select(
      "+password +passwordHistory +passwordResetToken +passwordResetExpires +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt +failedLoginAttempts +lockUntil",
    );

    if (!user || user.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid, expired, or already used.",
      });
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      });
    }

    for (const oldPassword of user.passwordHistory || []) {
      if (
        oldPassword?.hash &&
        (await bcrypt.compare(password, oldPassword.hash))
      ) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from previous passwords.",
        });
      }
    }

    if (user.password) {
      user.passwordHistory = [
        { hash: user.password, changedAt: new Date() },
        ...(user.passwordHistory || []),
      ].slice(0, 5);
    }

    user.password = password;
    user.passwordResetToken = "";
    user.passwordResetExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastPasswordResetAt = new Date();

    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();

    await Session.deleteMany({ user: user._id });
    await user.save();

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "PASSWORD_RESET_SUCCESS",
    });

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in again.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
    });
  }
}

/**
 * GET /api/v1/auth/verify-email/:token
 */
export async function verifyEmail(req, res) {
  try {
    const rawToken = String(req.params?.token || "").trim();

    if (!rawToken || rawToken.length < 32) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or expired.",
      });
    }

    const hashedToken = hashToken(rawToken);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user || user.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or expired.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = "";
    user.emailVerificationExpires = null;

    await user.save({ validateBeforeSave: false });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "EMAIL_VERIFIED",
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to verify email.",
    });
  }
}

/**
 * POST /api/v1/auth/resend-verification
 */
export async function resendVerificationEmail(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    const genericMessage =
      "If that account exists and is not verified, a new verification link has been sent.";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const user = await User.findOne({ email }).select(
      "+emailVerificationToken +emailVerificationExpires",
    );

    if (!user || user.isActive === false || user.isEmailVerified === true) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const { hashedToken } = createEmailVerificationToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    await logSecurityEvent(req, {
      user: user._id,
      email: user.email,
      type: "EMAIL_VERIFICATION_RESENT",
    });

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to process verification request.",
    });
  }
}
