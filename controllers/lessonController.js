// controllers/lessonController.js
import mongoose from "mongoose";
import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import LessonProgress from "../models/LessonProgressModel.js";
import {
  getCourseRequiredLevel,
  isSubscriptionActive,
  normalizeAccessLevel,
} from "../utils/accessRules.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const ALLOWED_UPDATE_FIELDS = [
  "course",
  "title",
  "description",
  "videoUrl",
  "durationInMinutes",
  "order",
  "isPreview",
  "isPublished",
  "resources",
];

function cleanText(value = "", max = 2000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanResources(resources = []) {
  if (!Array.isArray(resources)) return [];

  return resources
    .map((resource) => ({
      label: cleanText(resource?.label, 120),
      url: cleanText(resource?.url, 500),
    }))
    .filter((resource) => resource.label || resource.url)
    .slice(0, 20);
}

function removeProtectedVideoFields(lesson) {
  const safeLesson = { ...lesson };

  delete safeLesson.videoUrl;
  delete safeLesson.videoPublicId;
  delete safeLesson.secureVideoUrl;
  delete safeLesson.videoAssetId;

  return safeLesson;
}

function pickAllowedUpdates(body = {}) {
  const update = {};

  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      update[key] = body[key];
    }
  }

  return update;
}

function buildLessonPayload(body = {}, userId = null) {
  return {
    course: body.course || body.courseId,
    title: cleanText(body.title, 160),
    description: cleanText(body.description, 2000),
    videoUrl: cleanText(body.videoUrl, 500),
    durationInMinutes: cleanNumber(body.durationInMinutes, 0),
    order: cleanNumber(body.order, 0),
    isPreview: cleanBoolean(body.isPreview, false),
    isPublished: cleanBoolean(body.isPublished, true),
    resources: cleanResources(body.resources),
    createdBy: userId,
  };
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

  const subscription = await UserSubscription.findOne({ user: userId }).lean();

  if (!isSubscriptionActive(subscription)) {
    return {
      allowed: false,
      reason: "inactive_subscription",
      source: "subscription",
    };
  }

  const userLevel = normalizeAccessLevel(
    subscription.accessLevel || subscription.membershipId,
  );

  const requiredLevel = getCourseRequiredLevel(course);

  // exact-match only
  if (
    requiredLevel &&
    requiredLevel !== "none" &&
    userLevel === requiredLevel
  ) {
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
    reason: "membership_level_not_matching",
    source: "membership",
    userLevel,
    requiredLevel,
  };
}

// Admin: Get all lessons
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({})
      .populate(
        "course",
        "title slug category level requiredMembershipLevel isFree price",
      )
      .sort({ course: 1, order: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all lessons.",
    });
  }
};

// Admin: Create lesson
export const createLesson = async (req, res) => {
  try {
    const payload = buildLessonPayload(req.body, req.user?._id);

    if (!payload.course || !payload.title) {
      return res.status(400).json({
        success: false,
        message: "Course and lesson title are required.",
      });
    }

    if (!isValidObjectId(payload.course)) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required.",
      });
    }

    const courseDoc = await Course.findById(payload.course).select("_id title");

    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lesson = await Lesson.create(payload);

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate(
        "course",
        "title slug category level requiredMembershipLevel isFree price",
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully.",
      data: populatedLesson,
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors)[0]?.message || "Validation failed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create lesson.",
    });
  }
};

// Public/course lessons
// Public/course lessons
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
        .select(
          "_id title slug isFree level requiredMembershipLevel isPublished durationInMinutes totalLessons",
        )
        .lean();
    }

    if (!course) {
      course = await Course.findOne({
        slug: String(courseId).trim().toLowerCase(),
      })
        .select(
          "_id title slug isFree level requiredMembershipLevel isPublished durationInMinutes totalLessons",
        )
        .lean();
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const isAdmin =
      req.user && ["admin", "superadmin"].includes(String(req.user.role));

    if (course.isPublished === false && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "This course is not published yet.",
      });
    }

    const access = isAdmin
      ? { allowed: true, source: "admin", reason: "admin_access" }
      : await verifyCourseAccess(userId, course);

    const lessons = await Lesson.find({
      course: course._id,
      isPublished: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const safeLessons = lessons.map((lesson) => {
      const canPlay =
        Boolean(access.allowed) ||
        Boolean(lesson.isPreview) ||
        Boolean(course.isFree);

      return {
        ...lesson,
        isLocked: !canPlay,
        canPlay,
        videoUrl: canPlay ? lesson.videoUrl : "",
      };
    });

    const previewLesson =
      safeLessons.find((lesson) => lesson.isPreview && lesson.videoUrl) ||
      safeLessons.find((lesson) => lesson.canPlay && lesson.videoUrl) ||
      null;

    const totalDurationInMinutes = safeLessons.reduce(
      (sum, lesson) => sum + (Number(lesson.durationInMinutes) || 0),
      0,
    );

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
      previewLesson,
      totalLessons: safeLessons.length,
      totalDurationInMinutes,
      data: safeLessons,
      lessons: safeLessons,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course lessons.",
    });
  }
};

// Public/single lesson
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

    const query = isValidObjectId(id)
      ? { _id: id }
      : { slug: String(id).trim().toLowerCase() };

    const lesson = await Lesson.findOne(query)
      .populate(
        "course",
        "_id title slug isFree level requiredMembershipLevel isPublished",
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
      Boolean(lesson.isPreview) ||
      Boolean(lesson.course?.isFree) ||
      Boolean(access.allowed);

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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lesson.",
    });
  }
};

// User: update lesson progress
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
        message:
          "Access denied. The exact required membership for this course is required.",
        reason: access.reason,
      });
    }

    const freeCourse =
      lesson.course.isFree === true ||
      Number(lesson.course.price || 0) <= 0 ||
      String(lesson.course.requiredMembershipLevel || "").toLowerCase() ===
        "none";

    let enrollment = null;

    if (!enrollment && freeCourse) {
      enrollment = await Enrollment.findOneAndUpdate(
        {
          user: userId,
          course: lesson.course._id,
        },
        {
          $setOnInsert: {
            user: userId,
            course: lesson.course._id,
            pricePaid: 0,
            currency: "USD",
            paymentPlan: "free",
            paymentStatus: "paid",
            status: "active",
            accessType: "free",
            progressPercent: 0,
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

    if (safeDurationSeconds <= 0) {
      return res.status(400).json({
        success: false,
        message: "Video duration is required to save progress.",
      });
    }

    const previousProgress = await LessonProgress.findOne({
      user: userId,
      course: lesson.course._id,
      lesson: lesson._id,
    });

    const previousWatched = Number(previousProgress?.watchedSeconds || 0);
    const now = new Date();

    const elapsedSeconds = previousProgress?.lastWatchedAt
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() -
              new Date(previousProgress.lastWatchedAt).getTime()) /
              1000,
          ),
        )
      : 0;

    const graceSeconds = previousProgress ? 18 : 25;
    const maxAllowedWatched = previousProgress
      ? previousWatched + elapsedSeconds + graceSeconds
      : graceSeconds;

    const cappedWatched = Math.min(
      safeWatchedSeconds,
      safeDurationSeconds,
      maxAllowedWatched,
    );

    const attemptedSkip =
      safeWatchedSeconds > cappedWatched + 8 &&
      safeWatchedSeconds / safeDurationSeconds >= 0.9;

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
          lastWatchedAt: now,
          ...(completed ? { completedAt: now } : {}),
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
      enrollment.lastAccessedAt = now;

      if (progressPercent >= 100) {
        enrollment.status = "completed";
        enrollment.completedAt = enrollment.completedAt || now;
      } else if (enrollment.status === "completed") {
        enrollment.status = "active";
        enrollment.completedAt = null;
      }

      await enrollment.save();
    }

    return res.status(200).json({
      success: true,
      message: attemptedSkip
        ? "Please watch the lesson normally before it can be marked complete."
        : "Lesson progress updated.",
      accepted: !attemptedSkip,
      data: {
        lessonProgress: progress,
        enrollmentProgressPercent: progressPercent,
        attemptedSkip,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update lesson progress.",
    });
  }
};

// Admin: Update lesson
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid lesson ID is required.",
      });
    }

    const allowedUpdates = pickAllowedUpdates(req.body);

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid lesson fields provided.",
      });
    }

    if (allowedUpdates.course && !isValidObjectId(allowedUpdates.course)) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required.",
      });
    }

    if (allowedUpdates.course) {
      const courseExists = await Course.exists({ _id: allowedUpdates.course });

      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }
    }

    const cleanedUpdate = {};

    if ("course" in allowedUpdates)
      cleanedUpdate.course = allowedUpdates.course;
    if ("title" in allowedUpdates)
      cleanedUpdate.title = cleanText(allowedUpdates.title, 160);
    if ("description" in allowedUpdates)
      cleanedUpdate.description = cleanText(allowedUpdates.description, 2000);
    if ("videoUrl" in allowedUpdates)
      cleanedUpdate.videoUrl = cleanText(allowedUpdates.videoUrl, 500);
    if ("durationInMinutes" in allowedUpdates)
      cleanedUpdate.durationInMinutes = cleanNumber(
        allowedUpdates.durationInMinutes,
        0,
      );
    if ("order" in allowedUpdates)
      cleanedUpdate.order = cleanNumber(allowedUpdates.order, 0);
    if ("isPreview" in allowedUpdates)
      cleanedUpdate.isPreview = cleanBoolean(allowedUpdates.isPreview, false);
    if ("isPublished" in allowedUpdates)
      cleanedUpdate.isPublished = cleanBoolean(
        allowedUpdates.isPublished,
        true,
      );
    if ("resources" in allowedUpdates)
      cleanedUpdate.resources = cleanResources(allowedUpdates.resources);

    const lesson = await Lesson.findByIdAndUpdate(
      id,
      { $set: cleanedUpdate },
      {
        new: true,
        runValidators: true,
      },
    ).populate(
      "course",
      "title slug category level requiredMembershipLevel isFree price",
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
    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors)[0]?.message || "Validation failed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update lesson.",
    });
  }
};

// Admin: Delete lesson
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

    await LessonProgress.deleteMany({ lesson: id });

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete lesson.",
    });
  }
};
