// controllers/lessonController.js
import mongoose from "mongoose";
import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import LessonProgress from "../models/LessonProgressModel.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();
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

function removeProtectedVideoFields(lesson) {
  const safeLesson = { ...lesson };

  delete safeLesson.videoUrl;
  delete safeLesson.videoPublicId;
  delete safeLesson.secureVideoUrl;
  delete safeLesson.videoAssetId;

  return safeLesson;
}

async function verifyCourseAccess(userId, course) {
  if (!course?._id) {
    return {
      allowed: false,
      reason: "course_missing",
      source: "none",
    };
  }

  if (course.isFree) {
    return {
      allowed: true,
      reason: "free_course",
      source: "free",
    };
  }

  if (!userId) {
    return {
      allowed: false,
      reason: "auth_required",
      source: "none",
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
    subscription.accessLevel || subscription.membershipId
  );

  const requiredLevel = normalizeLevel(
    course.requiredMembershipLevel || course.level || "beginner"
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

// Admin: Get all lessons
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({})
      .populate("course", "title slug category level isFree price")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    console.error("getAllLessons error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all lessons.",
      error: error.message,
    });
  }
};

// Admin: Create a lesson
export const createLesson = async (req, res) => {
  try {
    const {
      course,
      title,
      description,
      videoUrl,
      durationInMinutes,
      order,
      isPreview,
      isPublished,
      resources,
    } = req.body;

    if (!course || !title) {
      return res.status(400).json({
        success: false,
        message: "course and title are required.",
      });
    }

    if (!isValidObjectId(course)) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required.",
      });
    }

    const courseDoc = await Course.findById(course);

    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lesson = await Lesson.create({
      course,
      title,
      description,
      videoUrl,
      durationInMinutes,
      order,
      isPreview,
      isPublished,
      resources,
      createdBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully.",
      data: lesson,
    });
  } catch (error) {
    console.error("createLesson error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create lesson.",
      error: error.message,
    });
  }
};

// Get all lessons for a course
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required.",
      });
    }

    let course = null;

    if (isValidObjectId(courseId)) {
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

    if (course.isPublished === false && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "This course is not published yet.",
      });
    }

    const access =
      req.user?.role === "admin"
        ? { allowed: true, source: "admin", reason: "admin_access" }
        : await verifyCourseAccess(userId, course);

    const query = {
      course: course._id,
      isPublished: true,
    };

    if (!access.allowed) {
      query.isPreview = true;
    }

    const lessons = await Lesson.find(query).sort({ order: 1, createdAt: 1 }).lean();

    const safeLessons = lessons.map((lesson) => {
      if (access.allowed || lesson.isPreview) return lesson;
      return removeProtectedVideoFields(lesson);
    });

    return res.status(200).json({
      success: true,
      access: {
        allowed: Boolean(access.allowed),
        source: access.source || "none",
        reason: access.reason || "",
        requiredLevel: access.requiredLevel || null,
        userLevel: access.userLevel || null,
      },
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        isFree: course.isFree,
        level: course.level,
        requiredMembershipLevel: course.requiredMembershipLevel,
      },
      count: safeLessons.length,
      data: safeLessons,
    });
  } catch (error) {
    console.error("getLessonsByCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course lessons.",
    });
  }
};

// Get a single lesson by ID or slug — protected against video leak
export const getLesson = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lesson id or slug is required.",
      });
    }

    const query = isValidObjectId(id) ? { _id: id } : { slug: id };

    const lesson = await Lesson.findOne(query)
      .populate(
        "course",
        "_id title slug isFree level requiredMembershipLevel isPublished"
      )
      .lean();

    if (!lesson || !lesson.course) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    if (!lesson.isPublished && req.user?.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    if (lesson.course.isPublished === false && req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "This course is not published yet.",
      });
    }

    const access =
      req.user?.role === "admin"
        ? { allowed: true, source: "admin", reason: "admin_access" }
        : await verifyCourseAccess(userId, lesson.course);

    const canWatchFullLesson =
      Boolean(lesson.isPreview) || Boolean(lesson.course?.isFree) || access.allowed;

    const safeLesson = canWatchFullLesson
      ? lesson
      : removeProtectedVideoFields(lesson);

    return res.status(200).json({
      success: true,
      access: {
        allowed: Boolean(canWatchFullLesson),
        source: access.source || "none",
        reason: access.reason || "",
        isPreview: Boolean(lesson.isPreview),
        requiredLevel: access.requiredLevel || null,
        userLevel: access.userLevel || null,
      },
      data: safeLesson,
    });
  } catch (error) {
    console.error("getLesson error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lesson.",
      error: error.message,
    });
  }
};

// Update lesson progress — supports paid enrollment OR active membership
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
        "_id title slug isFree level requiredMembershipLevel isPublished"
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

    if (!enrollment && access.source !== "enrollment") {
  return res.status(403).json({
    success: false,
    message:
      "Membership users can watch lessons but cannot create enrollment progress records.",
  });
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
      }
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

    enrollment.progressPercent = progressPercent;
    enrollment.lastAccessedAt = new Date();

    if (progressPercent >= 100) {
      enrollment.status = "completed";
      enrollment.completedAt = enrollment.completedAt || new Date();
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Lesson progress updated.",
      data: {
        lessonProgress: progress,
        enrollmentProgressPercent: progressPercent,
      },
    });
  } catch (error) {
    console.error("updateLessonProgress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lesson progress.",
    });
  }
};

// Admin: Update a lesson
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid lesson ID is required.",
      });
    }

    const lesson = await Lesson.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lesson updated successfully.",
      data: lesson,
    });
  } catch (error) {
    console.error("updateLesson error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lesson.",
      error: error.message,
    });
  }
};

// Admin: Delete a lesson
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid lesson ID is required.",
      });
    }

    const lesson = await Lesson.findByIdAndDelete(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully.",
    });
  } catch (error) {
    console.error("deleteLesson error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete lesson.",
      error: error.message,
    });
  }
};