import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Session from "../models/SessionModel.js";
import { emitToUser } from "../config/socket.js";

const PASSWORD_HISTORY_LIMIT = 5;

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function cleanString(value, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function getRequesterId(req) {
  return req.user?._id || req.user?.id;
}

function isSelfAction(req, targetUserId) {
  return String(getRequesterId(req)) === String(targetUserId);
}

function normalizeAccountStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(user) {
  return ["admin", "superadmin", "owner"].includes(
    String(user?.role || "").toLowerCase()
  );
}

function sendServerError(res, message = "Server error.") {
  return res.status(500).json({ success: false, message });
}

function safeProfile(user) {
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
    notifications: !!user.notifications,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accountStatus: user.accountStatus || "active",
    statusReason: user.statusReason || "",
    statusChangedAt: user.statusChangedAt || null,
    statusChangedBy: user.statusChangedBy || null,
    adminNotes: user.adminNotes || "",
    isDeleted: !!user.isDeleted,
    deletedAt: user.deletedAt || null,
    deletedBy: user.deletedBy || null,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: user.loginCount || 0,
    lastLoginIp: user.lastLoginIp || "",
    lastLoginUserAgent: user.lastLoginUserAgent || "",
    isEmailVerified: !!user.isEmailVerified,
  };
}

async function isReusedPassword(newPassword, currentHash, historyList) {
  if (currentHash && (await bcrypt.compare(String(newPassword), currentHash))) {
    return true;
  }

  for (const item of Array.isArray(historyList) ? historyList : []) {
    if (item?.hash && (await bcrypt.compare(String(newPassword), item.hash))) {
      return true;
    }
  }

  return false;
}

function removeLocalAvatarIfManaged(avatarPath) {
  if (!avatarPath || typeof avatarPath !== "string") return;
  if (!avatarPath.startsWith("/uploads/avatar/")) return;

  // eslint-disable-next-line no-undef
  const avatarRoot = path.resolve(process.cwd(), "uploads", "avatar");
  // eslint-disable-next-line no-undef
  const oldAbsPath = path.resolve(process.cwd(), avatarPath.replace(/^\/+/, ""));

  if (oldAbsPath.startsWith(avatarRoot + path.sep) && fs.existsSync(oldAbsPath)) {
    try {
      fs.unlinkSync(oldAbsPath);
    } catch {
      // Ignore avatar cleanup failure.
    }
  }
}

export async function getUsers(req, res) {
  try {
    const includeDeleted = String(req.query?.includeDeleted || "") === "true";
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };

    const users = await User.find(filter)
      .select(
        "_id name email role isActive accountStatus statusReason statusChangedAt statusChangedBy adminNotes isDeleted deletedAt deletedBy avatar createdAt updatedAt lastLoginAt loginCount lastLoginIp isEmailVerified"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        users,
        results: users.length,
      },
    });
  } catch {
    return sendServerError(res, "Failed to fetch users.");
  }
}

export async function getUser(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(req.params.id).select(
      "_id name email role isActive accountStatus statusReason statusChangedAt statusChangedBy adminNotes isDeleted deletedAt deletedBy avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt lastLoginAt loginCount lastLoginIp lastLoginUserAgent isEmailVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to fetch user.");
  }
}

export async function updateUser(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(req.params.id).select(
      "+password +passwordHistory +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isDeleted === true) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const body = req.body || {};
    const requesterId = getRequesterId(req);

    if (body.name !== undefined) user.name = cleanString(body.name, 80);

    if (body.email !== undefined) {
      const email = cleanString(body.email, 120).toLowerCase();

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required.",
        });
      }

      if (email !== String(user.email || "").toLowerCase()) {
        const exists = await User.findOne({
          email,
          _id: { $ne: user._id },
        }).select("_id");

        if (exists) {
          return res.status(409).json({
            success: false,
            message: "That email is already in use.",
          });
        }

        user.email = email;
        user.bumpTokenVersion?.();
        user.clearRefreshToken?.();
        await Session.deleteMany({ user: user._id });
      }
    }

    if (body.role !== undefined && String(requesterId) === String(user._id)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot change their own role from this route.",
      });
    }

    if (body.role !== undefined) {
      const role = cleanString(body.role, 20).toLowerCase();

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role value.",
        });
      }

      user.role = role;
      user.bumpTokenVersion?.();
      await Session.deleteMany({ user: user._id });
    }

    if (body.isActive !== undefined) {
      user.isActive = Boolean(body.isActive);

      if (!user.isActive) {
        user.bumpTokenVersion?.();
        user.clearRefreshToken?.();
        await Session.deleteMany({ user: user._id });
      }
    }

    if (body.password !== undefined) {
      const password = String(body.password || "");

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters.",
        });
      }

      if (await isReusedPassword(password, user.password, user.passwordHistory)) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from previous passwords.",
        });
      }

      if (user.password) {
        user.passwordHistory = [
          { hash: user.password, changedAt: new Date() },
          ...(user.passwordHistory || []),
        ].slice(0, PASSWORD_HISTORY_LIMIT);
      }

      user.password = password;
      user.bumpTokenVersion?.();
      user.clearRefreshToken?.();
      await Session.deleteMany({ user: user._id });
    }

    if (body.avatar !== undefined) user.avatar = cleanString(body.avatar, 500);
    if (body.phone !== undefined) user.phone = cleanString(body.phone, 30);
    if (body.location !== undefined) user.location = cleanString(body.location, 120);
    if (body.website !== undefined) user.website = cleanString(body.website, 300);
    if (body.instagram !== undefined) user.instagram = cleanString(body.instagram, 120);
    if (body.tiktok !== undefined) user.tiktok = cleanString(body.tiktok, 120);
    if (body.youtube !== undefined) user.youtube = cleanString(body.youtube, 300);
    if (body.xhandle !== undefined) user.xhandle = cleanString(body.xhandle, 120);
    if (body.bio !== undefined) user.bio = cleanString(body.bio, 1000);
    if (body.headline !== undefined) user.headline = cleanString(body.headline, 200);
    if (body.notifications !== undefined) {
      user.notifications = Boolean(body.notifications);
    }
    if (body.adminNotes !== undefined) {
      user.adminNotes = cleanString(body.adminNotes, 2000);
    }
    if (body.statusReason !== undefined) {
      user.statusReason = cleanString(body.statusReason, 500);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User successfully updated.",
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to update user.");
  }
}

export async function updateUserStatus(req, res) {
  try {
    const requesterId = getRequesterId(req);
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    if (isSelfAction(req, targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot change their own account status from this route.",
      });
    }

    const allowedStatuses = [
      "active",
      "on_hold",
      "suspended",
      "banned",
      "deactivated",
    ];

    const nextStatus = normalizeAccountStatus(req.body?.accountStatus);
    const statusReason = cleanString(req.body?.statusReason, 500);

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status.",
      });
    }

    const user = await User.findById(targetUserId).select(
      "+tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isDeleted === true) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (isAdminRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be moderated from this route.",
      });
    }

    user.accountStatus = nextStatus;
    user.statusReason = statusReason;
    user.statusChangedAt = new Date();
    user.statusChangedBy = requesterId;
    user.isActive = nextStatus === "active";

    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();

    await Session.deleteMany({ user: user._id });
    await user.save();

    emitToUser(user._id, "account:access-updated", {
      type: "status_changed",
      accountStatus: user.accountStatus,
      statusReason: user.statusReason,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      message:
        user.statusReason ||
        `Your account is now ${String(user.accountStatus).replaceAll("_", " ")}.`,
    });

    return res.status(200).json({
      success: true,
      message: `User account status updated to ${nextStatus}.`,
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to update user status.");
  }
}

export async function deleteUser(req, res) {
  try {
    const requesterId = getRequesterId(req);
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    if (String(requesterId) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete their own account from this route.",
      });
    }

    const user = await User.findById(targetUserId).select("_id role avatar");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (isAdminRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be permanently deleted from this route.",
      });
    }

    removeLocalAvatarIfManaged(user.avatar);

    await Session.deleteMany({ user: user._id });
    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User deleted.",
      data: { id: user._id },
    });
  } catch {
    return sendServerError(res, "Failed to delete user.");
  }
}

export async function getMe(req, res) {
  try {
    const id = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt accountStatus statusReason isDeleted isEmailVerified"
    );

    if (!user || user.isActive === false || user.isDeleted === true) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to fetch profile.");
  }
}

export async function updateMe(req, res) {
  try {
    const id = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt accountStatus statusReason isDeleted +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isActive === false || user.isDeleted === true) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const body = req.body || {};

    if (body.name !== undefined) user.name = cleanString(body.name, 80);

    if (body.email !== undefined) {
      const email = cleanString(body.email, 120).toLowerCase();

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required.",
        });
      }

      if (email !== String(user.email || "").toLowerCase()) {
        const exists = await User.findOne({
          email,
          _id: { $ne: user._id },
        }).select("_id");

        if (exists) {
          return res.status(409).json({
            success: false,
            message: "That email is already in use.",
          });
        }

        user.email = email;
        user.bumpTokenVersion?.();
        user.clearRefreshToken?.();
        await Session.deleteMany({ user: user._id });
      }
    }

    if (body.phone !== undefined) user.phone = cleanString(body.phone, 30);
    if (body.location !== undefined) user.location = cleanString(body.location, 120);
    if (body.website !== undefined) user.website = cleanString(body.website, 300);
    if (body.instagram !== undefined) user.instagram = cleanString(body.instagram, 120);
    if (body.tiktok !== undefined) user.tiktok = cleanString(body.tiktok, 120);
    if (body.youtube !== undefined) user.youtube = cleanString(body.youtube, 300);
    if (body.xhandle !== undefined) user.xhandle = cleanString(body.xhandle, 120);
    if (body.bio !== undefined) user.bio = cleanString(body.bio, 1000);
    if (body.headline !== undefined) user.headline = cleanString(body.headline, 200);
    if (body.notifications !== undefined) {
      user.notifications = Boolean(body.notifications);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated.",
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to update profile.");
  }
}

export async function updateMyAvatar(req, res) {
  try {
    const id = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!req.file?.filename) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded.",
      });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt accountStatus statusReason isDeleted"
    );

    if (!user || user.isActive === false || user.isDeleted === true) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    removeLocalAvatarIfManaged(user.avatar);

    user.avatar = `/uploads/avatar/${req.file.filename}`;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Avatar updated.",
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to update avatar.");
  }
}

export async function changeMyPassword(req, res) {
  try {
    const id = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    const user = await User.findById(id).select(
      "+password +passwordHistory +failedLoginAttempts +lockUntil +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt +tokenVersion"
    );

    if (!user || user.isActive === false || user.isDeleted === true) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const ok = await user.comparePassword(currentPassword);

    if (!ok) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    if (await isReusedPassword(newPassword, user.password, user.passwordHistory)) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from previous passwords.",
      });
    }

    if (user.password) {
      user.passwordHistory = [
        { hash: user.password, changedAt: new Date() },
        ...(user.passwordHistory || []),
      ].slice(0, PASSWORD_HISTORY_LIMIT);
    }

    user.password = newPassword;
    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await Session.deleteMany({ user: user._id });
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch {
    return sendServerError(res, "Failed to change password.");
  }
}

export async function forceLogoutUser(req, res) {
  try {
    const requesterId = getRequesterId(req);
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    if (String(requesterId) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot force logout their own account from this route.",
      });
    }

    const user = await User.findById(targetUserId).select(
      "+tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isDeleted === true) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (isAdminRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be force logged out from this route.",
      });
    }

    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();

    await Session.deleteMany({ user: user._id });
    await user.save();

    emitToUser(user._id, "auth:force-logout", {
      message: "Your account was logged out by an administrator.",
    });

    return res.status(200).json({
      success: true,
      message: "User has been logged out from all devices.",
      data: { id: user._id },
    });
  } catch {
    return sendServerError(res, "Failed to force logout user.");
  }
}

export async function softDeleteUser(req, res) {
  try {
    const requesterId = getRequesterId(req);
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    if (String(requesterId) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete their own account from this route.",
      });
    }

    const user = await User.findById(targetUserId).select(
      "+tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isDeleted === true) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (isAdminRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deleted from this route.",
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = requesterId;
    user.isActive = false;
    user.accountStatus = "deactivated";
    user.statusReason =
      cleanString(req.body?.statusReason, 500) ||
      "Account soft deleted by admin.";
    user.statusChangedAt = new Date();
    user.statusChangedBy = requesterId;

    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();

    await Session.deleteMany({ user: user._id });
    await user.save();

    emitToUser(user._id, "account:access-updated", {
      type: "archived",
      accountStatus: user.accountStatus,
      statusReason: user.statusReason,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      message:
        user.statusReason ||
        "Your account has been archived by an administrator.",
    });

    return res.status(200).json({
      success: true,
      message: "User account has been deactivated and archived.",
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to deactivate user.");
  }
}

export async function restoreUser(req, res) {
  try {
    const requesterId = getRequesterId(req);
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id.",
      });
    }

    if (String(requesterId) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot restore their own account from this route.",
      });
    }

    const user = await User.findById(targetUserId).select(
      "+tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (isAdminRole(user)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be restored from this route.",
      });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;
    user.isActive = true;
    user.accountStatus = "active";
    user.statusReason =
      cleanString(req.body?.statusReason, 500) || "Account restored by admin.";
    user.statusChangedAt = new Date();
    user.statusChangedBy = requesterId;

    user.bumpTokenVersion?.();
    user.clearRefreshToken?.();

    await Session.deleteMany({ user: user._id });
    await user.save();

    emitToUser(user._id, "account:access-updated", {
      type: "restored",
      accountStatus: user.accountStatus,
      statusReason: user.statusReason,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      message:
        user.statusReason ||
        "Your account has been restored by an administrator.",
    });

    return res.status(200).json({
      success: true,
      message: "User account has been restored and reactivated.",
      data: safeProfile(user),
    });
  } catch {
    return sendServerError(res, "Failed to restore user.");
  }
}