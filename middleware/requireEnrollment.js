// middleware/requireEnrollment.js
import mongoose from "mongoose";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

const MEMBERSHIP_RANK = {
  beginner: 1,
  intermediate: 2,
  advance: 3,
  complete: 4,
};

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();

  if (level === "advanced") return "advance";
  if (level === "all-levels") return "beginner";

  return level;
}

function membershipAllowsCourse(accessLevel, requiredLevel) {
  const access = normalizeLevel(accessLevel);
  const required = normalizeLevel(requiredLevel || "beginner");

  if (!required || required === "none") return true;
  if (access === "complete") return true;

  const accessRank = MEMBERSHIP_RANK[access] || 0;
  const requiredRank = MEMBERSHIP_RANK[required] || 1;

  return accessRank >= requiredRank;
}

export const requireEnrollment = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const courseId =
      req.params.courseId ||
      req.params.id ||
      req.body.courseId ||
      req.query.courseId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required for access check.",
      });
    }

    let course = null;

    if (mongoose.Types.ObjectId.isValid(courseId)) {
      course = await Course.findById(courseId)
        .select("_id title slug isFree level requiredMembershipLevel isPublished")
        .lean();
    }

    if (!course) {
      course = await Course.findOne({ slug: courseId })
        .select("_id title slug isFree level requiredMembershipLevel isPublished")
        .lean();
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (course.isPublished === false) {
      return res.status(403).json({
        success: false,
        message: "This course is not published yet.",
      });
    }

    const requiredLevel = normalizeLevel(
      course.requiredMembershipLevel || course.level || "beginner"
    );

    if (course.isFree || requiredLevel === "none") {
      req.course = course;
      req.courseAccess = {
        allowed: true,
        type: "free",
        courseId: course._id,
        requiredMembershipLevel: "none",
      };

      return next();
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: course._id,
      status: { $in: ["active", "completed"] },
      paymentStatus: "paid",
    }).select("_id status paymentStatus progressPercent");

    if (enrollment) {
      req.course = course;
      req.enrollment = enrollment;
      req.courseAccess = {
        allowed: true,
        type: "single-course",
        courseId: course._id,
        enrollmentId: enrollment._id,
        requiredMembershipLevel: requiredLevel,
      };

      return next();
    }

    const subscription = await UserSubscription.findOne({
      user: userId,
      status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
    })
      .select(
        "_id membership membershipId accessLevel status currentPeriodEnd cancelAtPeriodEnd"
      )
      .lean();

    if (subscription) {
      const isExpired =
        subscription.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd).getTime() < Date.now();

      const accessLevel = normalizeLevel(
        subscription.accessLevel || subscription.membershipId
      );

      if (!isExpired && membershipAllowsCourse(accessLevel, requiredLevel)) {
        req.course = course;
        req.subscription = subscription;
        req.courseAccess = {
          allowed: true,
          type: "membership",
          courseId: course._id,
          subscriptionId: subscription._id,
          accessLevel,
          requiredMembershipLevel: requiredLevel,
        };

        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message:
        "Access denied. Purchase this course or join the required membership.",
      code: "COURSE_ACCESS_REQUIRED",
      requiredMembershipLevel: requiredLevel,
      courseId: String(course._id),
    });
  } catch (error) {
    console.error("requireEnrollment error:", error);

    return res.status(500).json({
      success: false,
      message: "Course access check failed.",
    });
  }
};