// controllers/securityEventController.js
import mongoose from "mongoose";
import SecurityEvent from "../models/SecurityEventModel.js";
import User from "../models/UserModel.js";
import BlockedIp from "../models/BlockedIpModel.js";

function cleanString(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function getSecurityEvents(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

    const type = cleanString(req.query.type, 80);
    const email = cleanString(req.query.email, 120).toLowerCase();
    const reviewStatus = cleanString(req.query.reviewStatus, 40);

    const filter = {};

    if (type) filter.type = type;
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (email) filter.email = { $regex: email, $options: "i" };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email role isActive")
        .populate("reviewedBy", "name email role")
        .lean(),

      SecurityEvent.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error("getSecurityEvents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch security events.",
    });
  }
}

export async function updateSecurityEventReview(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid security event id.",
      });
    }

    const reviewStatus = cleanString(req.body?.reviewStatus, 40);
    const adminNote = cleanString(req.body?.adminNote, 1000);

    const allowed = ["unreviewed", "reviewed", "suspicious", "resolved", "ignored"];

    if (!allowed.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status.",
      });
    }

    const updated = await SecurityEvent.findByIdAndUpdate(
      id,
      {
        $set: {
          reviewStatus,
          adminNote,
          reviewedBy: req.user?._id || req.user?.id || null,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate("user", "name email role isActive")
      .populate("reviewedBy", "name email role");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Security event not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Security event reviewed.",
      item: updated,
    });
  } catch (error) {
    console.error("updateSecurityEventReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update security event review.",
    });
  }
}

export async function deleteSecurityEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid security event id.",
      });
    }

    const deleted = await SecurityEvent.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Security event not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Security event deleted.",
      deletedId: id,
    });
  } catch (error) {
    console.error("deleteSecurityEvent error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete security event.",
    });
  }
}

export async function deactivateUserFromSecurityEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid security event id.",
      });
    }

    const event = await SecurityEvent.findById(id);

    if (!event || !event.user) {
      return res.status(404).json({
        success: false,
        message: "No user attached to this security event.",
      });
    }

    if (String(event.user) === String(req.user?._id || req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot deactivate your own admin account from this page.",
      });
    }

    await User.findByIdAndUpdate(event.user, {
      $set: { isActive: false },
    });

    event.reviewStatus = "suspicious";
    event.actionTaken = "user_deactivated";
    event.adminNote =
      cleanString(req.body?.adminNote, 1000) ||
      "User account deactivated from security event review.";
    event.reviewedBy = req.user?._id || req.user?.id || null;
    event.reviewedAt = new Date();

    await event.save();

    return res.status(200).json({
      success: true,
      message: "User account deactivated.",
      item: event,
    });
  } catch (error) {
    console.error("deactivateUserFromSecurityEvent error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate user.",
    });
  }
}

export async function blockIpFromSecurityEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid security event id.",
      });
    }

    const event = await SecurityEvent.findById(id);

    if (!event || !event.ip) {
      return res.status(404).json({
        success: false,
        message: "No IP address attached to this security event.",
      });
    }

    await BlockedIp.findOneAndUpdate(
      { ip: event.ip },
      {
        $set: {
          ip: event.ip,
          reason:
            cleanString(req.body?.reason, 500) ||
            "Blocked from admin security event review.",
          sourceEvent: event._id,
          blockedBy: req.user?._id || req.user?.id || null,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    event.reviewStatus = "suspicious";
    event.actionTaken = "ip_blocked";
    event.adminNote =
      cleanString(req.body?.adminNote, 1000) ||
      `IP ${event.ip} blocked from security event review.`;
    event.reviewedBy = req.user?._id || req.user?.id || null;
    event.reviewedAt = new Date();

    await event.save();

    return res.status(200).json({
      success: true,
      message: `IP ${event.ip} blocked.`,
      item: event,
    });
  } catch (error) {
    console.error("blockIpFromSecurityEvent error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to block IP address.",
    });
  }
}

export async function deleteOldSecurityEvents(req, res) {
  try {
    const days = Math.max(Number(req.body?.days || 90), 30);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await SecurityEvent.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return res.status(200).json({
      success: true,
      message: `Security events older than ${days} days deleted.`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("deleteOldSecurityEvents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete old security events.",
    });
  }
}

export async function unblockIpFromSecurityEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid security event id.",
      });
    }

    const event = await SecurityEvent.findById(id);

    if (!event || !event.ip) {
      return res.status(404).json({
        success: false,
        message: "No IP address attached to this security event.",
      });
    }

    const blockedIp = await BlockedIp.findOneAndUpdate(
      { ip: event.ip },
      {
        $set: {
          isActive: false,
          reason: "Unblocked by admin security review.",
        },
      },
      { new: true }
    );

    if (!blockedIp) {
      return res.status(404).json({
        success: false,
        message: "This IP is not currently blocked.",
      });
    }

    event.reviewStatus = "resolved";
    event.actionTaken = "none";
    event.adminNote =
      cleanString(req.body?.adminNote, 1000) ||
      `IP ${event.ip} unblocked by admin.`;
    event.reviewedBy = req.user?._id || req.user?.id || null;
    event.reviewedAt = new Date();

    await event.save();

    return res.status(200).json({
      success: true,
      message: `IP ${event.ip} unblocked.`,
      item: event,
    });
  } catch (error) {
    console.error("unblockIpFromSecurityEvent error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unblock IP address.",
    });
  }
}