// models/ReviewModel.js
import mongoose from "mongoose";

/**
 * Review Model
 * ------------
 * Stores user course reviews with rating, title,
 * approval status, and duplicate-review protection.
 */
const reviewSchema = new mongoose.Schema(
  {
    // User who wrote the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
      index: true,
    },

    // Course being reviewed
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Review must belong to a course"],
    },

    // Star rating
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    // Optional review title
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "Review title cannot exceed 80 characters"],
    },

    // Review body
    comment: {
      type: String,
      trim: true,
      required: [true, "Review comment is required"],
      minlength: [10, "Review comment must be at least 10 characters"],
      maxlength: [1000, "Review comment cannot exceed 1000 characters"],
    },

    // Admin approval flag
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hard rule: one review per user per course.
 */
reviewSchema.index({ user: 1, course: 1 }, { unique: true });

/**
 * Query performance indexes.
 */
reviewSchema.index({ course: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

/**
 * Prevent model overwrite errors during development/hot reload.
 */
const Review =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;