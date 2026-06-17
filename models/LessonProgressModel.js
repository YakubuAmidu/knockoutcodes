// models/LessonProgressModel.js
import mongoose from "mongoose";

/**
 * Lesson Progress Model
 * ---------------------
 * Tracks how far a user has watched a specific lesson
 * inside a specific course.
 */
const lessonProgressSchema = new mongoose.Schema(
  {
    // User who owns this progress record
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Progress must belong to a user"],
    },

    // Course connected to the lesson
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Progress must belong to a course"],
      index: true,
    },

    // Lesson being tracked
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "Progress must belong to a lesson"],
      index: true,
    },

    // Total seconds watched by the user
    watchedSeconds: {
      type: Number,
      default: 0,
      min: [0, "Watched seconds cannot be negative"],
    },

    // Total duration of the lesson video
    durationSeconds: {
      type: Number,
      default: 0,
      min: [0, "Duration seconds cannot be negative"],
    },

    // Whether the lesson is completed
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When the lesson was completed
    completedAt: {
      type: Date,
      default: null,
    },

    // Last time user watched this lesson
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Prevent duplicate progress records for the same user/course/lesson.
 */
lessonProgressSchema.index({ user: 1, course: 1, lesson: 1 }, { unique: true });

/**
 * Speed up progress dashboard/course-player queries.
 */
lessonProgressSchema.index({ user: 1, course: 1, completed: 1 });
lessonProgressSchema.index({ user: 1, updatedAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const LessonProgress =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", lessonProgressSchema);

export default LessonProgress;
