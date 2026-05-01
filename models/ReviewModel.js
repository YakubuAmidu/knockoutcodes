// model/ReviewModel.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 80, // ✅ DB-level protection
    },
    comment: {
      type: String,
      trim: true,
      required: true,
      minlength: 10,  // ✅ DB-level protection
      maxlength: 1000 // ✅ DB-level protection
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true, // ✅ helps fast queries like getReviews()
    },
  },
  { timestamps: true }
);

// ✅ 1) Hard rule: one review per user per course (prevents duplicates forever)
reviewSchema.index({ user: 1, course: 1 }, { unique: true });

// ✅ 2) Speed up common queries
reviewSchema.index({ course: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;

