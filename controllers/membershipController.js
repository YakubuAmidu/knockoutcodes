// controllers/membershipController.js
import mongoose from "mongoose";
import Membership from "../models/MembershipModel.js";

const ALLOWED_FIELDS = [
  "membershipId",
  "title",
  "instructor",
  "priceLabel",
  "rating",
  "enrolled",
  "stripePriceId",
  "short",
  "meta",
  "glyph",
  "badgeLeft",
  "badgeRight",
  "highlight",
  "isPublished",
  "isFeatured",
];

function pick(obj = {}, keys = []) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function sendValidationError(res, error) {
  // mongoose validation / cast / dup key -> 400
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      error: error.message,
    });
  }

  // duplicate key errors
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      error: error.message,
    });
  }

  // invalid objectId etc.
  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
      error: error.message,
    });
  }

  return null;
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Escapes regex special chars to prevent regex injection / catastrophic patterns
function escapeRegex(input = "") {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const createMembership = async (req, res) => {
  try {
    const payload = pick(req.body, ALLOWED_FIELDS);

    // createdBy is server-side only
    if (req.user?._id) payload.createdBy = req.user._id;

    const created = await Membership.create(payload);

    res.status(201).json({
      success: true,
      message: "Membership created",
      data: created,
    });
  } catch (error) {
    console.error("createMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    res.status(500).json({
      success: false,
      message: "Failed to create membership",
      error: error.message,
    });
  }
};

export const getMemberships = async (req, res) => {
  try {
    const filters = {};

    // ✅ keep your published flag
    if (req.query.published === "true") filters.isPublished = true;

    // ✅ keyword safety (limit length + escape regex)
    if (req.query.keyword) {
      const raw = String(req.query.keyword).trim();

      // prevents huge spam strings
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

    // ✅ keep your sorting behavior
    const sort =
      req.query.sort === "top-rated"
        ? "-rating -enrolled"
        : req.query.sort === "enrolled"
        ? "-enrolled"
        : "-createdAt";

    // ✅ pagination (safe defaults; won’t break existing UI)
    // If your frontend doesn't send page/limit, it still works like before.
    const page = clampInt(req.query.page, 1, 5000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 100); // default 100 so it feels like “all”
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Membership.find(filters).sort(sort).skip(skip).limit(limit),
      Membership.countDocuments(filters),
    ]);

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch memberships",
      error: error.message,
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
      return res.status(404).json({ success: false, message: "Membership not found" });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("getMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    res.status(500).json({
      success: false,
      message: "Failed to fetch membership",
      error: error.message,
    });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { membershipId: id };

    // ✅ only update safe fields
    const safeUpdate = pick(req.body, ALLOWED_FIELDS);

    const updated = await Membership.findOneAndUpdate(
      query,
      { $set: safeUpdate },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }

    res.status(200).json({
      success: true,
      message: "Membership updated",
      data: updated,
    });
  } catch (error) {
    console.error("updateMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    res.status(500).json({
      success: false,
      message: "Failed to update membership",
      error: error.message,
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { membershipId: id };

    const deleted = await Membership.findOneAndDelete(query);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }

    res.status(200).json({ success: true, message: "Membership deleted" });
  } catch (error) {
    console.error("deleteMembership error:", error);

    const handled = sendValidationError(res, error);
    if (handled) return;

    res.status(500).json({
      success: false,
      message: "Failed to delete membership",
      error: error.message,
    });
  }
};

export const getMembershipLessons = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) resolve membership by ObjectId OR membershipId OR slug
    let membership = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      membership = await Membership.findById(id).lean();
    }
    if (!membership) membership = await Membership.findOne({ membershipId: id }).lean();
    if (!membership) membership = await Membership.findOne({ slug: id }).lean();

    // 2) not found
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }

    // 3) only published memberships should serve lessons
    if (!membership.isPublished) {
      return res.status(404).json({ success: false, message: "Membership not available" });
    }

    // 4) If you store lessons in membership.lessons
    const lessons = Array.isArray(membership.lessons) ? membership.lessons : [];

    return res.status(200).json({
      success: true,
      data: {
        membershipId: membership.membershipId,
        title: membership.title,
        lessons,
      },
    });
  } catch (err) {
    console.error("getMembershipLessons error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch membership lessons" });
  }
};
