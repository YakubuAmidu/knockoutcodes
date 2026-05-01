// controllers/lessonController.js
import mongoose from "mongoose";
import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import Subscription from '../models/UserSubscriptionModel.js';
import Enrollment from "../models/EnrollmentModel.js";

// Create a lesson
export const createLesson = async (req, res) => {
  try {
    const { course, title, description, videoUrl, durationInMinutes, order, isPreview, isPublished, resources } =
      req.body;

    if (!course || !title) {
      return res.status(400).json({
        success: false,
        message: "course and title are required.",
      });
    }

    // Make sure course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lessonData = {
      course,
      title,
      description,
      videoUrl,
      durationInMinutes,
      order,
      isPreview,
      isPublished,
      resources,
    };

    // Attach createdBy if auth is used
    if (req.user && req.user._id) {
      lessonData.createdBy = req.user._id;
    }

    const lesson = await Lesson.create(lessonData);

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

// Get all lessons for a course (PROTECTED + PREVIEW SAFE)
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Valid courseId param is required.",
      });
    }

    const course = await Course.findById(courseId)
      .select("isFree title")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Default: not allowed until proven
    let allowed = false;

    // Free course -> allowed
    if (course.isFree) {
      allowed = true;
    } else {
      // Paid course -> must be logged in with either enrollment OR active subscription
      const userId = req.user?._id || req.user?.id;

      if (userId) {
        const [enrollment, subscription] = await Promise.all([
          Enrollment.findOne({
            user: userId,
            course: courseId,
            status: { $ne: "cancelled" },
          }).select("_id status").lean(),

          Subscription.findOne({ user: userId })
            .select("status")
            .lean(),
        ]);

        const hasActiveSub = Boolean(
          subscription &&
            (subscription.status === "active" || subscription.status === "trialing")
        );

        allowed = Boolean(enrollment || hasActiveSub);
      }
    }

    // Build filter + projection
    const baseFilter = { course: courseId, isPublished: true };

    // If NOT allowed and NOT free -> only previews
    const filter = allowed ? baseFilter : { ...baseFilter, isPreview: true };

    // If NOT allowed -> do not return videoUrl (prevents video leak)
    const projection = allowed
      ? {}
      : { videoUrl: 0 }; // hide videoUrl when locked

    const lessons = await Lesson.find(filter, projection)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      access: {
        allowed,
        mode: course.isFree ? "free" : allowed ? "unlocked" : "preview",
      },
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    console.error("getLessonsByCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lessons.",
      error: error.message,
    });
  }
};

// Get a single lesson by ID or slug
export const getLesson = async (req, res) => {
  try {
    const { id } = req.params;
    let lesson = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      lesson = await Lesson.findById(id).populate("course", "title slug");
    }

    if (!lesson) {
      lesson = await Lesson.findOne({ slug: id }).populate("course", "title slug");
    }

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: lesson,
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

// Update a lesson
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findOneAndUpdate(
      { _id: id },
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

// Delete a lesson
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

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
