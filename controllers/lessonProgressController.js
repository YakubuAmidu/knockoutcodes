import mongoose from "mongoose";
import Lesson from "../models/LessonModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import LessonProgress from "../models/LessonProgressModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

function normalizeLevel(value) {
  const level = String(value || "")
    .trim()
    .toLowerCase();
  if (level === "advanced") return "advance";
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

function isFreeCourse(course) {
  return (
    course?.isFree === true ||
    Number(course?.price || 0) <= 0 ||
    String(course?.requiredMembershipLevel || "").toLowerCase() === "none"
  );
}

async function verifyCourseAccess(userId, course) {
  if (!course?._id) {
    return {
      allowed: false,
      reason: "course_missing",
      source: "none",
    };
  }

  if (isFreeCourse(course)) {
    return {
      allowed: true,
      reason: "free_course",
      source: "free",
    };
  }

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: course._id,
    status: { $in: ["active", "completed"] },
    paymentStatus: "paid",
  });

  if (enrollment) {
    return {
      allowed: true,
      reason: "paid_enrollment",
      source: "enrollment",
      enrollment,
    };
  }

  const subscription = await UserSubscription.findOne({ user: userId }).lean();

  if (!isSubscriptionActive(subscription)) {
    return {
      allowed: false,
      reason: "inactive_subscription",
      source: "subscription",
    };
  }

  const userLevel = normalizeLevel(
    subscription.accessLevel || subscription.membershipId,
  );

  const requiredLevel = normalizeLevel(
    course.requiredMembershipLevel || course.level || "beginner",
  );

  if (userLevel === requiredLevel) {
    return {
      allowed: true,
      reason: "active_membership",
      source: "membership",
      subscription,
      userLevel,
      requiredLevel,
    };
  }

  return {
    allowed: false,
    reason: "membership_level_too_low",
    source: "membership",
    userLevel,
    requiredLevel,
  };
}

export const updateLessonProgress = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { lessonId } = req.params;
    const { watchedSeconds = 0, durationSeconds = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "Valid lessonId is required.",
      });
    }

    const lesson = await Lesson.findById(lessonId)
      .populate(
        "course",
        "_id title slug isFree price salePrice level requiredMembershipLevel isPublished",
      )
      .select("_id course isPublished")
      .lean();

    if (!lesson || !lesson.isPublished || !lesson.course) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    if (lesson.course.isPublished === false) {
      return res.status(403).json({
        success: false,
        message: "This course is not published yet.",
      });
    }

    const access = await verifyCourseAccess(userId, lesson.course);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Active enrollment or membership required.",
        reason: access.reason,
      });
    }

    let enrollment = access.enrollment || null;

    if (!enrollment && isFreeCourse(lesson.course)) {
      enrollment = await Enrollment.findOneAndUpdate(
        {
          user: userId,
          course: lesson.course._id,
        },
        {
          $setOnInsert: {
            user: userId,
            course: lesson.course._id,
            status: "active",
            paymentStatus: "paid",
            paymentPlan: "free",
            accessType: "free",
            pricePaid: 0,
            currency: "USD",
            enrolledAt: new Date(),
            startedAt: new Date(),
          },
          $set: {
            lastAccessedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      );
    }

    const safeWatchedSeconds = Math.max(0, Number(watchedSeconds) || 0);
    const safeDurationSeconds = Math.max(0, Number(durationSeconds) || 0);

    const cappedWatched =
      safeDurationSeconds > 0
        ? Math.min(safeWatchedSeconds, safeDurationSeconds)
        : safeWatchedSeconds;

    const completed =
      safeDurationSeconds > 0 && cappedWatched / safeDurationSeconds >= 0.9;

    const progress = await LessonProgress.findOneAndUpdate(
      {
        user: userId,
        course: lesson.course._id,
        lesson: lesson._id,
      },
      {
        $max: {
          watchedSeconds: cappedWatched,
        },
        $set: {
          durationSeconds: safeDurationSeconds,
          completed,
          lastWatchedAt: new Date(),
          ...(completed ? { completedAt: new Date() } : {}),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    const totalLessons = await Lesson.countDocuments({
      course: lesson.course._id,
      isPublished: true,
    });

    const completedLessons = await LessonProgress.countDocuments({
      user: userId,
      course: lesson.course._id,
      completed: true,
    });

    const progressPercent =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;

    if (enrollment) {
      enrollment.progressPercent = progressPercent;
      enrollment.lastAccessedAt = new Date();

      if (progressPercent >= 100) {
        enrollment.status = "completed";
        enrollment.completedAt = enrollment.completedAt || new Date();
      } else if (enrollment.status === "completed") {
        enrollment.status = "active";
        enrollment.completedAt = null;
      }

      await enrollment.save();
    }

    return res.status(200).json({
      success: true,
      message: "Lesson progress updated.",
      data: {
        lessonProgress: progress,
        enrollmentProgressPercent: progressPercent,
        accessSource: access.source,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update lesson progress.",
    });
  }
};
