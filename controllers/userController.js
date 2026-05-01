import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Session from "../models/SessionModel.js";

const PASSWORD_HISTORY_LIMIT = 5;

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function cleanString(value, max = 300) {
  return String(value || "").trim().slice(0, max);
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
  };
}

function sendServerError(res, message = "Server error.") {
  return res.status(500).json({ success: false, message });
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
      // ignore
    }
  }
}

export async function getUsers(_req, res) {
  try {
    const users = await User.find({})
      .select("_id name email role isActive avatar createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { users, results: users.length },
    });
  } catch {
    return sendServerError(res, "Failed to fetch users.");
  }
}

export async function getUser(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const user = await User.findById(req.params.id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, data: safeProfile(user) });
  } catch {
    return sendServerError(res, "Failed to fetch user.");
  }
}

export async function updateUser(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const user = await User.findById(req.params.id).select(
      "+password +passwordHistory +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const body = req.body || {};

    if (body.name !== undefined) user.name = cleanString(body.name, 80);

    if (body.email !== undefined) {
      const email = cleanString(body.email, 120).toLowerCase();

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
      }

      if (email !== String(user.email || "").toLowerCase()) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");

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

    if (body.role !== undefined) {
      const role = cleanString(body.role, 20).toLowerCase();

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role value." });
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
    if (body.notifications !== undefined) user.notifications = Boolean(body.notifications);

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

export async function deleteUser(req, res) {
  try {
    const requesterId = req.user?._id || req.user?.id;
    const targetUserId = req.params.id;

    if (!isValidId(targetUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    if (String(requesterId) === String(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete their own account from this route.",
      });
    }

    const user = await User.findById(targetUserId).select("_id avatar");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
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
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt"
    );

    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    return res.status(200).json({ success: true, data: safeProfile(user) });
  } catch {
    return sendServerError(res, "Failed to fetch profile.");
  }
}

export async function updateMe(req, res) {
  try {
    const id = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt +tokenVersion +refreshTokenHash +refreshTokenId +refreshTokenExpiresAt"
    );

    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const body = req.body || {};

    if (body.name !== undefined) user.name = cleanString(body.name, 80);

    if (body.email !== undefined) {
      const email = cleanString(body.email, 120).toLowerCase();

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
      }

      if (email !== String(user.email || "").toLowerCase()) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");

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
    if (body.notifications !== undefined) user.notifications = Boolean(body.notifications);

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
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!req.file?.filename) {
      return res.status(400).json({ success: false, message: "No image uploaded." });
    }

    const user = await User.findById(id).select(
      "_id name email role isActive avatar phone location website instagram tiktok youtube xhandle bio headline notifications createdAt updatedAt"
    );

    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: "Authentication required." });
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
      return res.status(401).json({ success: false, message: "Authentication required." });
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

    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: "Authentication required." });
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