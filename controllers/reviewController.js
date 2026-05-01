// controllers/reviewController.js
import Review from "../models/ReviewModel.js";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";

// @desc    Create a new review (5-star system)
// @route   POST /api/reviews
// @access  Private (logged-in user)
export const createReview = async (req, res) => {
  try {
    const { courseId, rating, title, comment } = req.body;
    const userId = req.user?._id;

    if (!courseId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "courseId, rating, and comment are required",
      });
    };

    // Strict validation (anti-scam / anti-bot payloads)
const parsedRating = Number(rating);

if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
  return res.status(400).json({
    success: false,
    message: "Rating must be a number between 1 and 5",
  });
}

const cleanTitle = title ? String(title).trim() : "";
const cleanComment = String(comment).trim();

if (cleanTitle.length > 80) {
  return res.status(400).json({
    success: false,
    message: "Title is too long (max 80 characters)",
  });
}

if (cleanComment.length < 10 || cleanComment.length > 1000) {
  return res.status(400).json({
    success: false,
    message: "Comment must be between 10 and 1000 characters",
  });
}

// Basic spam-link blocking (simple but effective)
const urlPattern = /(https?:\/\/|www\.)/i;
if (urlPattern.test(cleanTitle) || urlPattern.test(cleanComment)) {
  return res.status(400).json({
    success: false,
    message: "Links are not allowed in reviews",
  });
    };

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ NEW: Require verified enrollment
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      status: "active",
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to leave a review",
      });
    }

    const existing = await Review.findOne({ user: userId, course: courseId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this course",
      });
    }

    const review = await Review.create({
      user: userId,
      course: courseId,
      rating,
      title,
      comment,
    });

    const populatedReview = await review.populate("user", "name email");

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: populatedReview,
    });
  } catch (error) {
  console.error("Error creating review:", error);

  // ✅ Handle duplicate review (unique index protection)
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "You have already reviewed this course",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Failed to create review",
    error: error.message,
  });
  };
};

// @desc    Get reviews (optionally by course) with rating summary
// @route   GET /api/reviews
// @access  Public
export const getReviews = async (req, res) => {
  try {
    const { courseId } = req.query;

    const filter = { isApproved: true };
    if (courseId) {
      filter.course = courseId;
    }

    const reviews = await Review.find(filter)
      .populate("user", "name email")
      .populate("course", "title slug")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: {
        reviews,
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// @desc    Get single review by ID
// @route   GET /api/reviews/:id
// @access  Public
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "name email")
      .populate("course", "title slug");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review fetched successfully",
      data: review,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch review",
      error: error.message,
    });
  }
};

// @desc    Update review (user can update own, admin can update any)
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { rating, title, comment, isApproved } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;

    // Only admin can change approval status
    if (isAdmin && typeof isApproved === "boolean") {
      review.isApproved = isApproved;
    }

    const updated = await review.save();

    const populated = await updated
      .populate("user", "name email")
      .populate("course", "title slug");

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

// @desc    Delete review (user can delete own, admin can delete any)
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    await review.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};

// @desc    Admin: get all reviews (including unapproved)
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
export const getAdminReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("user", "name email")
      .populate("course", "title slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Admin reviews fetched successfully",
      data: reviews,
    });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin reviews",
      error: error.message,
    });
  }
};

// @desc    Admin: approve a review
// @route   PATCH /api/reviews/admin/:id/approve
// @access  Private/Admin
export const approveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.isApproved = true;
    await review.save();

    const populated = await review
      .populate("user", "name email")
      .populate("course", "title slug");

    return res.status(200).json({
      success: true,
      message: "Review approved successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error approving review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve review",
      error: error.message,
    });
  }
};

export default {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getAdminReviews,
  approveReview,
};
