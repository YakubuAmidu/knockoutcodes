// controllers/membershipController.js
import mongoose from "mongoose";
import Membership from "../models/MembershipModel.js";

const ALLOWED_FIELDS = [
  "membershipId",
  "accessLevel",
  "title",
  "instructor",
  "priceLabel",
  "monthlyPriceLabel",
  "yearlyPriceLabel",
  "stripePriceId",
  "stripePriceIdMonthly",
  "stripePriceIdYearly",
  "rating",
  "enrolled",
  "short",
  "meta",
  "glyph",
  "badgeLeft",
  "badgeRight",
  "highlight",
  "isPublished",
  "isFeatured",
  "sortOrder",
];

function pick(obj = {}, keys = []) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function sendValidationError(res, error) {
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message || "Validation failed",
    });
  }

  if (error?.code === 11000) {
    const field =
      Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";

    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
    });
  }

  return null;
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function escapeRegex(input = "") {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMembershipPayload(payload = {}) {
  const clean = { ...payload };

  if (clean.membershipId) {
    clean.membershipId = String(clean.membershipId).trim().toLowerCase();
    if (clean.membershipId === "advanced") clean.membershipId = "advance";
  }

  if (clean.accessLevel) {
    clean.accessLevel = String(clean.accessLevel).trim().toLowerCase();
    if (clean.accessLevel === "advanced") clean.accessLevel = "advance";
  }

  if (!clean.accessLevel && clean.membershipId) {
    clean.accessLevel = clean.membershipId;
  }

  return clean;
}

export const createMembership = async (req, res) => {
  try {
    let payload = pick(req.body, ALLOWED_FIELDS);
    payload = normalizeMembershipPayload(payload);

    if (req.user?._id) payload.createdBy = req.user._id;

    const created = await Membership.create(payload);

    return res.status(201).json({
      success: true,
      message: "Membership created",
      data: created,
    });
  } catch (error) {
    console.error("createMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    return res.status(500).json({
      success: false,
      message: "Failed to create membership",
    });
  }
};

export const getMemberships = async (req, res) => {
  try {
    const filters = {};

    if (req.query.published === "true") filters.isPublished = true;

    if (req.query.keyword) {
      const raw = String(req.query.keyword).trim();
      const trimmed = raw.slice(0, 60);

      if (trimmed.length) {
        const safe = escapeRegex(trimmed);

        filters.$or = [
          { title: { $regex: safe, $options: "i" } },
          { short: { $regex: safe, $options: "i" } },
          { instructor: { $regex: safe, $options: "i" } },
          { membershipId: { $regex: safe, $options: "i" } },
          { slug: { $regex: safe, $options: "i" } },
        ];
      }
    }

    const sort =
      req.query.sort === "top-rated"
        ? "-rating -enrolled"
        : req.query.sort === "enrolled"
        ? "-enrolled"
        : "sortOrder -createdAt";

    const page = clampInt(req.query.page, 1, 5000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Membership.find(filters).sort(sort).skip(skip).limit(limit),
      Membership.countDocuments(filters),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("getMemberships error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch memberships",
    });
  }
};

export const getMembership = async (req, res) => {
  try {
    const { id } = req.params;
    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Membership.findById(id).lean();
    }

    if (!item) item = await Membership.findOne({ membershipId: id }).lean();
    if (!item) item = await Membership.findOne({ slug: id }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("getMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    return res.status(500).json({
      success: false,
      message: "Failed to fetch membership",
    });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { membershipId: id };

    let safeUpdate = pick(req.body, ALLOWED_FIELDS);
    safeUpdate = normalizeMembershipPayload(safeUpdate);

    const updated = await Membership.findOneAndUpdate(
      query,
      { $set: safeUpdate },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Membership updated",
      data: updated,
    });
  } catch (error) {
    console.error("updateMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    return res.status(500).json({
      success: false,
      message: "Failed to update membership",
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { membershipId: id };

    const deleted = await Membership.findOneAndDelete(query);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Membership deleted",
    });
  } catch (error) {
    console.error("deleteMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    return res.status(500).json({
      success: false,
      message: "Failed to delete membership",
    });
  }
};

export const getMembershipLessons = async (req, res) => {
  try {
    const { id } = req.params;

    let membership = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      membership = await Membership.findById(id).lean();
    }

    if (!membership) membership = await Membership.findOne({ membershipId: id }).lean();
    if (!membership) membership = await Membership.findOne({ slug: id }).lean();

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    if (!membership.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Membership not available",
      });
    }

    const lessons = Array.isArray(membership.lessons) ? membership.lessons : [];

    return res.status(200).json({
      success: true,
      data: {
        membershipId: membership.membershipId,
        title: membership.title,
        lessons,
      },
    });
  } catch (error) {
    console.error("getMembershipLessons error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch membership lessons",
    });
  }
};