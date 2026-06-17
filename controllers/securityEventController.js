// controllers/securityEventController.js
import mongoose from "mongoose";
import SecurityEvent from "../models/SecurityEventModel.js";
import BlockedIp from "../models/BlockedIpModel.js";
import User from "../models/UserModel.js";

const VALID_REVIEW_STATUSES = [
  "unreviewed",
  "reviewed",
  "suspicious",
  "resolved",
  "ignored",
];

const cleanText = (value = "", max = 500) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export async function getSecurityEvents(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 100);
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.type) query.type = cleanText(req.query.type, 80);
  if (req.query.reviewStatus) {
    query.reviewStatus = cleanText(req.query.reviewStatus, 40);
  }
  if (req.query.severity) query.severity = cleanText(req.query.severity, 40);
  if (req.query.category) query.category = cleanText(req.query.category, 40);

  if (req.query.email) {
    query.email = { $regex: cleanText(req.query.email, 120), $options: "i" };
  }

  if (req.query.ip) {
    query.ip = { $regex: cleanText(req.query.ip, 80), $options: "i" };
  }

  const [items, total] = await Promise.all([
    SecurityEvent.find(query)
      .sort({ lastSeenAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email role isActive")
      .populate("reviewedBy", "name email role")
      .lean(),
    SecurityEvent.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: items,
    items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
}

export async function updateSecurityEventReview(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const reviewStatus = cleanText(req.body.reviewStatus, 40);
  const adminNote = cleanText(req.body.adminNote, 1000);

  if (!VALID_REVIEW_STATUSES.includes(reviewStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid review status.",
    });
  }

  const event = await SecurityEvent.findByIdAndUpdate(
    id,
    {
      reviewStatus,
      adminNote,
      reviewedBy: req.user?._id || null,
      reviewedAt: new Date(),
    },
    { new: true },
  );

  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  res.status(200).json({
    success: true,
    message: "Security event reviewed.",
    data: event,
  });
}

export async function deleteSecurityEvent(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const event = await SecurityEvent.findByIdAndDelete(id);

  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  res.status(200).json({
    success: true,
    message: "Security event deleted.",
  });
}

export async function deactivateUserFromSecurityEvent(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const event = await SecurityEvent.findById(id);

  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  if (!event.user) {
    return res.status(400).json({
      success: false,
      message: "No user is connected to this event.",
    });
  }

  const user = await User.findByIdAndUpdate(
    event.user,
    { isActive: false },
    { new: true },
  ).select("name email role isActive");

  await SecurityEvent.findByIdAndUpdate(id, {
    reviewStatus: "resolved",
    adminNote:
      cleanText(req.body.adminNote, 1000) ||
      "User deactivated from admin security review.",
    reviewedBy: req.user?._id || null,
    reviewedAt: new Date(),
    actionTaken: "user_deactivated",
  });

  res.status(200).json({
    success: true,
    message: "User account deactivated.",
    data: user,
  });
}

export async function blockIpFromSecurityEvent(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const event = await SecurityEvent.findById(id);

  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  if (!event.ip) {
    return res.status(400).json({
      success: false,
      message: "This event does not have an IP address.",
    });
  }

  const reason =
    cleanText(req.body.reason, 500) || "Blocked from admin security review.";

  const blockedIp = await BlockedIp.findOneAndUpdate(
    { ip: event.ip },
    {
      ip: event.ip,
      reason,
      sourceEvent: event._id,
      blockedBy: req.user?._id || null,
      unblockedBy: null,
      unblockedAt: null,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await SecurityEvent.findByIdAndUpdate(id, {
    reviewStatus: "resolved",
    adminNote:
      cleanText(req.body.adminNote, 1000) ||
      `IP ${event.ip} blocked from security review.`,
    reviewedBy: req.user?._id || null,
    reviewedAt: new Date(),
    actionTaken: "ip_blocked",
  });

  res.status(200).json({
    success: true,
    message: "IP address blocked.",
    data: blockedIp,
  });
}

export async function unblockIpFromSecurityEvent(req, res) {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const event = await SecurityEvent.findById(id);

  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  if (!event.ip) {
    return res.status(400).json({
      success: false,
      message: "This event does not have an IP address.",
    });
  }

  await BlockedIp.findOneAndUpdate(
    { ip: event.ip },
    {
      isActive: false,
      unblockedBy: req.user?._id || null,
      unblockedAt: new Date(),
    },
    { new: true },
  );

  await SecurityEvent.findByIdAndUpdate(id, {
    reviewStatus: "resolved",
    adminNote:
      cleanText(req.body.adminNote, 1000) ||
      `IP ${event.ip} unblocked from security review.`,
    reviewedBy: req.user?._id || null,
    reviewedAt: new Date(),
    actionTaken: "ip_unblocked",
  });

  res.status(200).json({
    success: true,
    message: "IP address unblocked.",
  });
}

export async function deleteOldSecurityEvents(req, res) {
  const days = Math.min(
    Math.max(Number(req.body.days || req.query.days) || 90, 30),
    365,
  );

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await SecurityEvent.deleteMany({
    createdAt: { $lt: cutoff },
    reviewStatus: { $in: ["reviewed", "resolved", "ignored"] },
  });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount || 0} old reviewed security logs.`,
    deletedCount: result.deletedCount || 0,
  });
}
