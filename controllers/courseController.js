// controllers/courseController.js
import mongoose from "mongoose";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import Review from "../models/ReviewModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

/* ======================================================
   SECURITY HELPERS
====================================================== */

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "advanced") return "advance";
  if (level === "all-levels") return "beginner";
  if (level === "none") return "none";
  return level || "beginner";
}

function isSubscriptionActive(sub) {
  if (!sub) return false;
  if (!["active", "trialing"].includes(sub.status)) return false;

  if (
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd).getTime() < Date.now()
  ) {
    return false;
  }

  return true;
}

function hasExactMembershipAccess(userLevel, requiredLevel) {
  const cleanUserLevel = normalizeLevel(userLevel);
  const cleanRequiredLevel = normalizeLevel(requiredLevel);

  if (!cleanUserLevel || !cleanRequiredLevel) return false;
  if (cleanRequiredLevel === "none") return true;

  return cleanUserLevel === cleanRequiredLevel;
}

const sanitizeCoursePayload = (payload = {}) => {
  const allowedFields = [
    "title",
    "description",
    "shortDescription",
    "category",
    "focusArea",
    "level",
    "requiredMembershipLevel",
    "allowSinglePurchase",
    "stripePriceId",
    "thumbnail",
    "promoVideo",
    "price",
    "salePrice",
    "isFree",
    "durationInMinutes",
    "totalLessons",
    "language",
    "equipmentNeeded",
    "requirements",
    "whatYouWillLearn",
    "tags",
    "isFeatured",
    "isPublished",
  ];

  const clean = {};

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      clean[key] = payload[key];
    }
  }

  return clean;
};

const isAdminUser = (req) =>
  req.user && ["admin", "superadmin"].includes(String(req.user.role));

/* ======================================================
   COURSE STATS
====================================================== */

async function getCourseStats(courseId) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return {
      studentsCount: 0,
      ratingAverage: 0,
      ratingCount: 0,
    };
  }

  const [studentsCount, reviewStats] = await Promise.all([
    Enrollment.countDocuments({
      course: courseId,
      paymentStatus: "paid",
      status: { $in: ["active", "completed"] },
    }),

    Review.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
          isApproved: true,
        },
      },
      {
        $group: {
          _id: "$course",
          ratingAverage: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = reviewStats[0] || {};

  return {
    studentsCount,
    ratingAverage: stats.ratingAverage
      ? Number(stats.ratingAverage.toFixed(1))
      : 0,
    ratingCount: stats.ratingCount || 0,
  };
}

async function attachStatsToCourse(course) {
  if (!course) return course;

  const plainCourse = course.toObject ? course.toObject() : course;

  if (!plainCourse?._id) return plainCourse;

  const stats = await getCourseStats(plainCourse._id);

  return {
    ...plainCourse,
    ...stats,
  };
}

/* ======================================================
   CREATE COURSE
====================================================== */

export const createCourse = async (req, res) => {
  try {
    const data = sanitizeCoursePayload(req.body);

    const price = Number(data.price || 0);

const salePrice =
  data.salePrice === "" ||
  data.salePrice === null ||
  data.salePrice === undefined
    ? null
    : Number(data.salePrice);

if (!Number.isFinite(price) || price < 0) {
  return sendError(res, 400, "Price must be a valid number.");
}

if (
  salePrice !== null &&
  (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
) {
  return sendError(
    res,
    400,
    "Sale price must be less than regular price."
  );
}

data.price = price;
data.salePrice = salePrice;

    if (req.user?._id) {
      data.createdBy = req.user._id;
    }

    const course = await Course.create(data);
    const courseWithStats = await attachStatsToCourse(course);

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: courseWithStats,
      course: courseWithStats,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return sendError(res, 400, "Course validation failed.");
    }

    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "A course with this slug or unique value already exists.",
        error
      );
    }

    return sendError(res, 500, "Failed to create course", error);
  }
};

/* ======================================================
   GET COURSES
====================================================== */

export const getCourses = async (req, res) => {
  try {
    const MAX_LIMIT = 50;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filters = {};

    const adminRequest =
      isAdminUser(req) &&
      (req.query.admin === "true" || req.query.includeUnpublished === "true");

    if (!adminRequest) {
      filters.isPublished = true;
    } else if (req.query.published === "true") {
      filters.isPublished = true;
    } else if (req.query.published === "false") {
      filters.isPublished = false;
    }

    if (req.query.category) {
      filters.category = String(req.query.category).trim();
    }

    if (req.query.level) {
      filters.level = String(req.query.level).trim().toLowerCase();
    }

    if (req.query.requiredMembershipLevel) {
      filters.requiredMembershipLevel = String(
        req.query.requiredMembershipLevel
      )
        .trim()
        .toLowerCase();
    }

    if (req.query.featured === "true") {
      filters.isFeatured = true;
    }

    if (req.query.free === "true") {
      filters.isFree = true;
    }

    if (req.query.free === "false") {
      filters.isFree = false;
    }

    if (req.query.keyword || req.query.search) {
      const keyword = escapeRegex(
        String(req.query.keyword || req.query.search).trim().slice(0, 120)
      );

      if (keyword) {
        filters.$or = [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { category: { $regex: keyword, $options: "i" } },
          { tags: { $regex: keyword, $options: "i" } },
        ];
      }
    }

    let sort = { createdAt: -1 };

    if (req.query.sort === "price-asc") {
      sort = { price: 1, createdAt: -1 };
    } else if (req.query.sort === "price-desc") {
      sort = { price: -1, createdAt: -1 };
    } else if (req.query.sort === "featured") {
      sort = { isFeatured: -1, createdAt: -1 };
    } else if (req.query.sort === "popular") {
      sort = { studentsCount: -1, ratingAverage: -1, createdAt: -1 };
    }

    const [total, courses] = await Promise.all([
      Course.countDocuments(filters),
      Course.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email role")
        .lean(),
    ]);

    const coursesWithStats = await Promise.all(
      courses.map((course) => attachStatsToCourse(course))
    );

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      count: coursesWithStats.length,
      data: coursesWithStats,
      courses: coursesWithStats,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch courses", error);
  }
};

/* ======================================================
   GET SINGLE COURSE
====================================================== */

export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    let course = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id)
        .populate("createdBy", "name email role")
        .lean();
    }

    if (!course) {
      course = await Course.findOne({ slug: String(id).toLowerCase().trim() })
        .populate("createdBy", "name email role")
        .lean();
    }

    if (!course) {
      return sendError(res, 404, "Course not found");
    }

    if (!course.isPublished && !isAdminUser(req)) {
      return sendError(res, 404, "Course not found");
    }

    const courseWithStats = await attachStatsToCourse(course);

    return res.status(200).json({
      success: true,
      data: courseWithStats,
      course: courseWithStats,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch course", error);
  }
};

/* ======================================================
   UPDATE COURSE
====================================================== */

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid course ID.");
    }

    const updateData = sanitizeCoursePayload(req.body);

    const price = Number(updateData.price || 0);

const salePrice =
  updateData.salePrice === "" ||
  updateData.salePrice === null ||
  updateData.salePrice === undefined
    ? null
    : Number(updateData.salePrice);

if (!Number.isFinite(price) || price < 0) {
  return sendError(res, 400, "Price must be a valid number.");
}

if (
  salePrice !== null &&
  (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
) {
  return sendError(
    res,
    400,
    "Sale price must be less than regular price."
  );
}

updateData.price = price;
updateData.salePrice = salePrice;

    const course = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).populate("createdBy", "name email role");

    if (!course) {
      return sendError(res, 404, "Course not found");
    }

    const courseWithStats = await attachStatsToCourse(course);

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: courseWithStats,
      course: courseWithStats,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return sendError(res, 400, "Course validation failed.");
    }

    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "A course with this slug or unique value already exists.",
        error
      );
    }

    return sendError(res, 500, "Failed to update course", error);
  }
};

/* ======================================================
   DELETE COURSE
====================================================== */

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid course ID.");
    }

    const course = await Course.findById(id);

    if (!course) {
      return sendError(res, 404, "Course not found");
    }

    const activeEnrollments = await Enrollment.countDocuments({
      course: id,
      status: { $in: ["active", "completed"] },
    });

    if (activeEnrollments > 0) {
      return sendError(
        res,
        400,
        "Cannot delete a course that already has enrolled students."
      );
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to delete course", error);
  }
};

/* ======================================================
   COURSE PLAYER
   FIXED:
   - Admin can watch
   - Free course can watch
   - Single purchase enrollment can watch
   - Active exact-level membership can watch
====================================================== */

export const getCoursePlayer = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const userId = req.user?._id || req.user?.id;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return sendError(res, 400, "Valid course ID is required.");
    }

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    const course = await Course.findById(courseId)
      .select(
        "title description thumbnail level category focusArea promoVideo durationInMinutes totalLessons language equipmentNeeded requirements whatYouWillLearn tags ratingAverage ratingCount studentsCount isPublished requiredMembershipLevel isFree allowSinglePurchase"
      )
      .lean();

    if (!course) {
      return sendError(res, 404, "Course not found.");
    }

    const admin = isAdminUser(req);

    if (!course.isPublished && !admin) {
      return sendError(res, 403, "This course is not published.");
    }

    let enrollment = null;
    let subscription = null;
    let accessReason = admin ? "admin" : course.isFree ? "free_course" : "";
    let accessSource = admin ? "admin" : course.isFree ? "free" : "";
    let requiredLevel = normalizeLevel(
      course.requiredMembershipLevel || course.level || "beginner"
    );
    let userLevel = null;

    if (!admin && !course.isFree) {
      enrollment = await Enrollment.findOne({
        user: userId,
        course: courseId,
        paymentStatus: "paid",
        status: { $in: ["active", "completed"] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .select("_id status paymentStatus progressPercent startedAt lastAccessedAt")
        .lean();

      if (enrollment) {
        accessReason = "paid_enrollment";
        accessSource = "enrollment";
      }

      if (!enrollment) {
        subscription = await UserSubscription.findOne({ user: userId })
          .select(
            "_id membershipId accessLevel status currentPeriodStart currentPeriodEnd billingPeriod cancelAtPeriodEnd"
          )
          .lean();

        if (isSubscriptionActive(subscription)) {
          userLevel = normalizeLevel(
            subscription.accessLevel || subscription.membershipId
          );

          if (hasExactMembershipAccess(userLevel, requiredLevel)) {
            accessReason = "active_membership";
            accessSource = "membership";
          } else {
            return sendError(
              res,
              403,
              `This course requires ${requiredLevel} membership. Your active membership is ${userLevel}.`
            );
          }
        } else {
          return sendError(
            res,
            403,
            "You must enroll in this course or have an active matching membership before watching it."
          );
        }
      }
    }

    const courseWithStats = await attachStatsToCourse(course);

    return res.status(200).json({
      success: true,
      access: {
        allowed: true,
        source: accessSource,
        reason: accessReason,
        requiredLevel,
        userLevel,
      },
      enrollment,
      membershipAccess:
        accessSource === "membership"
          ? {
              membershipId: subscription.membershipId,
              accessLevel: subscription.accessLevel,
              subscriptionStatus: subscription.status,
              billingPeriod: subscription.billingPeriod,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
            }
          : null,
      data: courseWithStats,
      course: courseWithStats,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch course player data.", error);
  }
};