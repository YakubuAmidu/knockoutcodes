import mongoose from "mongoose";
import Membership, { normalizeLevel } from "../models/MembershipModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import Review from "../models/ReviewModel.js";
import Course from "../models/CourseModel.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

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

  for (const key of keys) {
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }

  return out;
}

function sendValidationError(res, error) {
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
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
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function escapeRegex(input = "") {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMembershipPayload(payload = {}) {
  const clean = { ...payload };

  if (clean.membershipId) {
    clean.membershipId = normalizeLevel(clean.membershipId);
  }

  if (clean.accessLevel) {
    clean.accessLevel = normalizeLevel(clean.accessLevel);
  }

  if (!clean.accessLevel && clean.membershipId) {
    clean.accessLevel = clean.membershipId;
  }

  return clean;
}

function roundRating(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(5, Math.max(0, Number(number.toFixed(1))));
}

async function getCourseIdsByMembershipLevel(level) {
  const normalizedLevel = normalizeLevel(level);

  const courses = await Course.find({
    requiredMembershipLevel: normalizedLevel,
  })
    .select("_id")
    .lean();

  return courses.map((course) => course._id);
}

async function getMembershipStatsMap(levels = []) {
  const cleanLevels = [...new Set(levels.map(normalizeLevel).filter(Boolean))];

  const emptyStats = cleanLevels.reduce((acc, level) => {
    acc[level] = {
      rating: 0,
      enrolled: 0,
      reviewCount: 0,
    };
    return acc;
  }, {});

  if (!cleanLevels.length) return emptyStats;

  const [subscriptionStats, courses] = await Promise.all([
    UserSubscription.aggregate([
      {
        $match: {
          membershipId: { $in: cleanLevels },
          status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
        },
      },
      {
        $group: {
          _id: "$membershipId",
          enrolled: { $sum: 1 },
        },
      },
    ]),

    Course.find({
      requiredMembershipLevel: { $in: cleanLevels },
    })
      .select("_id requiredMembershipLevel")
      .lean(),
  ]);

  for (const item of subscriptionStats) {
    const level = normalizeLevel(item?._id);

    if (emptyStats[level]) {
      emptyStats[level].enrolled = Number(item.enrolled || 0);
    }
  }

  const courseIdsByLevel = courses.reduce((acc, course) => {
    const level = normalizeLevel(course.requiredMembershipLevel);

    if (!acc[level]) acc[level] = [];
    acc[level].push(course._id);

    return acc;
  }, {});

  const allCourseIds = courses.map((course) => course._id);

  if (!allCourseIds.length) return emptyStats;

  const reviewStats = await Review.aggregate([
    {
      $match: {
        course: { $in: allCourseIds },
        approved: true,
        rating: { $gte: 1, $lte: 5 },
      },
    },
    {
      $group: {
        _id: "$course",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const reviewStatsByCourse = reviewStats.reduce((acc, item) => {
    acc[String(item._id)] = {
      averageRating: Number(item.averageRating || 0),
      reviewCount: Number(item.reviewCount || 0),
    };
    return acc;
  }, {});

  for (const level of cleanLevels) {
    const ids = courseIdsByLevel[level] || [];

    let totalWeightedRating = 0;
    let totalReviews = 0;

    for (const courseId of ids) {
      const stats = reviewStatsByCourse[String(courseId)];
      if (!stats) continue;

      totalWeightedRating += stats.averageRating * stats.reviewCount;
      totalReviews += stats.reviewCount;
    }

    emptyStats[level].reviewCount = totalReviews;
    emptyStats[level].rating =
      totalReviews > 0 ? roundRating(totalWeightedRating / totalReviews) : 0;
  }

  return emptyStats;
}

async function attachRealMembershipStats(items = []) {
  const list = Array.isArray(items) ? items : [];

  const levels = list.map((item) => item.accessLevel || item.membershipId);
  const statsMap = await getMembershipStatsMap(levels);

  return list.map((item) => {
    const level = normalizeLevel(item.accessLevel || item.membershipId);
    const stats = statsMap[level] || {
      rating: 0,
      enrolled: 0,
      reviewCount: 0,
    };

    return {
      ...item,
      rating: stats.rating,
      enrolled: stats.enrolled,
      reviewCount: stats.reviewCount,
    };
  });
}

async function findMembershipByIdOrSlug(id) {
  let item = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    item = await Membership.findById(id).lean();
  }

  if (!item) {
    item = await Membership.findOne({
      membershipId: normalizeLevel(id),
    }).lean();
  }

  if (!item) {
    item = await Membership.findOne({
      slug: String(id || "")
        .trim()
        .toLowerCase(),
    }).lean();
  }

  return item;
}

function validateStripePriceIds(data = {}) {
  const ids = [
    {
      value: data.stripePriceId,
      message: "Invalid Stripe price ID",
    },
    {
      value: data.stripePriceIdMonthly,
      message: "Invalid Monthly Stripe price ID",
    },
    {
      value: data.stripePriceIdYearly,
      message: "Invalid Yearly Stripe price ID",
    },
  ];

  for (const item of ids) {
    if (item.value && !String(item.value).trim().startsWith("price_")) {
      return item.message;
    }
  }

  return null;
}

export const createMembership = async (req, res) => {
  try {
    let payload = pick(req.body, ALLOWED_FIELDS);
    payload = normalizeMembershipPayload(payload);

    const stripeError = validateStripePriceIds(payload);

    if (stripeError) {
      return res.status(400).json({
        success: false,
        message: stripeError,
      });
    }

    if (req.user?._id) {
      payload.createdBy = req.user._id;
    }

    const created = await Membership.create(payload);

    const [withStats] = await attachRealMembershipStats([created.toObject()]);

    return res.status(201).json({
      success: true,
      message: "Membership created",
      data: withStats,
    });
  } catch (error) {
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

    if (req.query.published === "true") {
      filters.isPublished = true;
    }

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

    const [rawData, total] = await Promise.all([
      Membership.find(filters).sort(sort).skip(skip).limit(limit).lean(),
      Membership.countDocuments(filters),
    ]);

    const data = await attachRealMembershipStats(rawData);

    if (req.query.sort === "top-rated") {
      data.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.enrolled - a.enrolled;
      });
    }

    if (req.query.sort === "enrolled") {
      data.sort((a, b) => b.enrolled - a.enrolled);
    }

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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch memberships",
    });
  }
};

export const getMembership = async (req, res) => {
  try {
    const item = await findMembershipByIdOrSlug(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    if (
      !item.isPublished &&
      !["admin", "superadmin"].includes(
        String(req.user?.role || "").toLowerCase(),
      )
    ) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const [data] = await attachRealMembershipStats([item]);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
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
      : { membershipId: normalizeLevel(id) };

    let safeUpdate = pick(req.body, ALLOWED_FIELDS);
    safeUpdate = normalizeMembershipPayload(safeUpdate);

    const stripeError = validateStripePriceIds(safeUpdate);

    if (stripeError) {
      return res.status(400).json({
        success: false,
        message: stripeError,
      });
    }

    const updated = await Membership.findOneAndUpdate(
      query,
      { $set: safeUpdate },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const [data] = await attachRealMembershipStats([updated]);

    return res.status(200).json({
      success: true,
      message: "Membership updated",
      data,
    });
  } catch (error) {
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
      : { membershipId: normalizeLevel(id) };

    const existingMembership = await Membership.findOne(query);

    if (!existingMembership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const activeSubscribers = await UserSubscription.countDocuments({
      membershipId: existingMembership.membershipId,
      status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
    });

    if (activeSubscribers > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a membership that still has active subscribers.",
      });
    }

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
    const membership = await findMembershipByIdOrSlug(req.params.id);

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

    const courseIds = await getCourseIdsByMembershipLevel(
      membership.accessLevel || membership.membershipId,
    );

    return res.status(200).json({
      success: true,
      data: {
        membershipId: membership.membershipId,
        accessLevel: membership.accessLevel,
        title: membership.title,
        courseIds,
        lessons: [],
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch membership lessons",
    });
  }
};
