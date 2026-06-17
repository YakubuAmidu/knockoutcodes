import mongoose from "mongoose";
import Review from "../models/ReviewModel.js";
import Course from "../models/CourseModel.js";
import Product from "../models/ProductModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import Order from "../models/OrderModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import Membership from "../models/MembershipModel.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const normalizeText = (value = "") => String(value).trim().replace(/\s+/g, " ");

const normalizeLevel = (value) => {
  const level = String(value || "")
    .trim()
    .toLowerCase();
  if (level === "advanced") return "advance";
  return level;
};

const isSubscriptionActive = (sub) => {
  if (!sub) return false;

  const status = String(sub.status || "").toLowerCase();

  if (!["active", "trialing"].includes(status)) return false;

  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
    return false;
  }

  return true;
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  if (error?.code === 11000) return "You have already reviewed this item.";
  return error?.message || fallback;
};

const validateReviewInput = ({ rating, title, comment }) => {
  const parsedRating = Number(rating);
  const cleanTitle = normalizeText(title || "");
  const cleanComment = normalizeText(comment || "");

  if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return {
      ok: false,
      message: "Rating must be a number between 1 and 5.",
    };
  }

  if (cleanTitle.length > 80) {
    return {
      ok: false,
      message: "Title is too long. Maximum is 80 characters.",
    };
  }

  if (cleanComment.length < 10 || cleanComment.length > 1000) {
    return {
      ok: false,
      message: "Comment must be between 10 and 1000 characters.",
    };
  }

  const blockedPattern =
    /(https?:\/\/|www\.|<script|<\/script|javascript:|onerror=|onload=)/i;

  if (blockedPattern.test(cleanTitle) || blockedPattern.test(cleanComment)) {
    return {
      ok: false,
      message: "Links or unsafe content are not allowed in reviews.",
    };
  }

  return {
    ok: true,
    parsedRating,
    cleanTitle,
    cleanComment,
  };
};

const updateCourseRatingStats = async (courseId) => {
  if (!courseId || !isValidObjectId(courseId)) return;

  const stats = await Review.aggregate([
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$course",
        ratingCount: { $sum: 1 },
        ratingAverage: { $avg: "$rating" },
      },
    },
  ]);

  const ratingCount = stats[0]?.ratingCount || 0;
  const ratingAverage = stats[0]?.ratingAverage || 0;

  await Course.findByIdAndUpdate(courseId, {
    ratingAverage: Number(ratingAverage.toFixed(1)),
    ratingCount,
  });
};

const updateProductRatingStats = async (productId) => {
  if (!productId || !isValidObjectId(productId)) return;

  const stats = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$product",
        ratingCount: { $sum: 1 },
        ratingAverage: { $avg: "$rating" },
      },
    },
  ]);

  const ratingCount = stats[0]?.ratingCount || 0;
  const ratingAverage = stats[0]?.ratingAverage || 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Number(ratingAverage.toFixed(1)),
    ratingCount,
  });
};

const updateMembershipRatingStats = async (membershipId) => {
  if (!membershipId || !isValidObjectId(membershipId)) return;

  const stats = await Review.aggregate([
    {
      $match: {
        membership: new mongoose.Types.ObjectId(membershipId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$membership",
        ratingCount: { $sum: 1 },
        ratingAverage: { $avg: "$rating" },
      },
    },
  ]);

  const ratingCount = stats[0]?.ratingCount || 0;
  const ratingAverage = stats[0]?.ratingAverage || 0;

  await Membership.findByIdAndUpdate(membershipId, {
    ratingAverage: Number(ratingAverage.toFixed(1)),
    ratingCount,
  });
};

const userPurchasedProduct = async ({ userId, productId }) => {
  const order = await Order.findOne({
    user: userId,
    paymentStatus: "paid",
    items: {
      $elemMatch: {
        product: productId,
      },
    },
  }).select("_id");

  return Boolean(order);
};

const userHasCourseSubscriptionAccess = async ({ userId, course }) => {
  const requiredLevel = normalizeLevel(
    course.accessLevel || course.level || course.membershipLevel,
  );

  if (!requiredLevel) return false;

  const subscription = await UserSubscription.findOne({
    user: userId,
  }).sort({ createdAt: -1 });

  if (!isSubscriptionActive(subscription)) return false;

  const userLevel = normalizeLevel(
    subscription.accessLevel ||
      subscription.level ||
      subscription.membershipLevel,
  );

  return userLevel === requiredLevel;
};

const userHasMembershipAccess = async ({ userId, membership }) => {
  if (!userId || !membership) return false;

  const requiredLevel = normalizeLevel(
    membership.accessLevel || membership.membershipId || membership.slug,
  );

  if (!requiredLevel) return false;

  const subscription = await UserSubscription.findOne({
    user: userId,
  }).sort({ createdAt: -1 });

  if (!isSubscriptionActive(subscription)) return false;

  const userLevel = normalizeLevel(
    subscription.accessLevel || subscription.membershipId,
  );

  return userLevel === requiredLevel;
};

const populateReview = (query) =>
  query
    .populate("user", "name email role")
    .populate("course", "title slug")
    .populate("product", "title slug name")
    .populate("membership", "title slug membershipId accessLevel");

export const createReview = async (req, res) => {
  try {
    const {
      reviewType = "course",
      courseId,
      productId,
      membershipId,
      rating,
      title,
      comment,
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to leave a review.",
      });
    }

    const cleanReviewType = String(reviewType || "")
      .trim()
      .toLowerCase();
    const isProductReview = cleanReviewType === "product";
    const isCourseReview = cleanReviewType === "course";
    const isMembershipReview = cleanReviewType === "membership";

    if (!isProductReview && !isCourseReview && !isMembershipReview) {
      return res.status(400).json({
        success: false,
        message: "Invalid review type.",
      });
    }

    const targetId = isProductReview
      ? productId
      : isMembershipReview
        ? membershipId
        : courseId;

    if (!targetId || !isValidObjectId(targetId)) {
      return res.status(400).json({
        success: false,
        message: isProductReview
          ? "A valid productId is required."
          : isMembershipReview
            ? "A valid membershipId is required."
            : "A valid courseId is required.",
      });
    }

    const validated = validateReviewInput({ rating, title, comment });

    if (!validated.ok) {
      return res.status(400).json({
        success: false,
        message: validated.message,
      });
    }

    if (isProductReview) {
      const product =
        await Product.findById(productId).select("_id title slug");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const hasPurchased = await userPurchasedProduct({ userId, productId });

      if (!hasPurchased) {
        return res.status(403).json({
          success: false,
          message: "You must purchase this product before leaving a review.",
        });
      }

      const existing = await Review.findOne({
        user: userId,
        reviewType: "product",
        product: productId,
      }).select("_id");

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this product.",
        });
      }

      const review = await Review.create({
        user: userId,
        reviewType: "product",
        product: productId,
        rating: validated.parsedRating,
        title: validated.cleanTitle,
        comment: validated.cleanComment,
        isApproved: false,
      });

      await updateMembershipRatingStats(membershipId);

      await updateProductRatingStats(productId);

      const populatedReview = await populateReview(Review.findById(review._id));

      return res.status(201).json({
        success: true,
        message:
          "Product review submitted successfully. It will appear after admin approval.",
        data: populatedReview,
      });
    }

    if (isMembershipReview) {
      const membership = await Membership.findById(membershipId).select(
        "_id title slug membershipId accessLevel",
      );

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: "Membership not found.",
        });
      }

      const hasMembershipAccess = await userHasMembershipAccess({
        userId,
        membership,
      });

      if (!hasMembershipAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You must have an active matching membership before leaving a review.",
        });
      }

      const existing = await Review.findOne({
        user: userId,
        reviewType: "membership",
        membership: membershipId,
      }).select("_id");

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this membership.",
        });
      }

      const review = await Review.create({
        user: userId,
        reviewType: "membership",
        membership: membershipId,
        rating: validated.parsedRating,
        title: validated.cleanTitle,
        comment: validated.cleanComment,
        isApproved: false,
      });

      const populatedReview = await populateReview(Review.findById(review._id));

      return res.status(201).json({
        success: true,
        message:
          "Membership review submitted successfully. It will appear after admin approval.",
        data: populatedReview,
      });
    }

    const course = await Course.findById(courseId).select(
      "_id title slug accessLevel level membershipLevel requiredMembershipLevel isFree price salePrice",
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      status: { $in: ["active", "completed"] },
    }).select(
      "_id progressPercent completedAt status paymentStatus paymentPlan accessType",
    );

    const hasSubscriptionAccess = await userHasCourseSubscriptionAccess({
      userId,
      course,
    });

    const isFreeCourse =
      course.isFree === true ||
      Number(course.price || 0) <= 0 ||
      String(course.accessLevel || "").toLowerCase() === "free" ||
      String(course.requiredMembershipLevel || "").toLowerCase() === "none";

    if (!isFreeCourse && !enrollment && !hasSubscriptionAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course or have an active matching subscription to leave a review.",
      });
    }

    if (isFreeCourse) {
      const progressPercent = Number(enrollment?.progressPercent || 0);
      const completedCourse = Boolean(
        enrollment?.completedAt || progressPercent >= 90,
      );

      if (!completedCourse) {
        return res.status(403).json({
          success: false,
          message:
            "Finish watching the free course before leaving a verified review.",
        });
      }
    }

    const existing = await Review.findOne({
      user: userId,
      reviewType: "course",
      course: courseId,
    }).select("_id");

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this course.",
      });
    }

    const review = await Review.create({
      user: userId,
      reviewType: "course",
      course: courseId,
      rating: validated.parsedRating,
      title: validated.cleanTitle,
      comment: validated.cleanComment,
      isApproved: false,
    });

    await updateCourseRatingStats(courseId);

    const populatedReview = await populateReview(Review.findById(review._id));

    return res.status(201).json({
      success: true,
      message:
        "Course review submitted successfully. It will appear after admin approval.",
      data: populatedReview,
    });
  } catch (error) {
    return res.status(error?.code === 11000 ? 409 : 500).json({
      success: false,
      message: getErrorMessage(error, "Failed to create review."),
    });
  }
};

export const getReviews = async (req, res) => {
  try {
    const {
      courseId,
      productId,
      membershipId,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isApproved: true };

    if (courseId) {
      if (!isValidObjectId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseId.",
        });
      }

      filter.course = courseId;
    }

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId.",
        });
      }

      filter.product = productId;
    }

    if (membershipId) {
      if (!isValidObjectId(membershipId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid membershipId.",
        });
      }

      filter.membership = membershipId;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [reviews, totalReviews, stats] = await Promise.all([
      populateReview(
        Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
          },
        },
      ]),
    ]);

    const averageRating = stats[0]?.averageRating || 0;

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully.",
      data: {
        reviews,
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        page: safePage,
        pages: Math.max(1, Math.ceil(totalReviews / safeLimit)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
};

export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id.",
      });
    }

    const review = await populateReview(Review.findById(id));

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (!review.isApproved && req.user?.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review fetched successfully.",
      data: review,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch review.",
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { rating, title, comment, isApproved } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id.",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const isOwner = review.user.toString() === userId?.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review.",
      });
    }

    if (!isAdmin && typeof isApproved !== "undefined") {
      return res.status(403).json({
        success: false,
        message: "Only admin can approve or unapprove reviews.",
      });
    }

    if (rating !== undefined || title !== undefined || comment !== undefined) {
      const validated = validateReviewInput({
        rating: rating !== undefined ? rating : review.rating,
        title: title !== undefined ? title : review.title,
        comment: comment !== undefined ? comment : review.comment,
      });

      if (!validated.ok) {
        return res.status(400).json({
          success: false,
          message: validated.message,
        });
      }

      review.rating = validated.parsedRating;
      review.title = validated.cleanTitle;
      review.comment = validated.cleanComment;

      if (!isAdmin) {
        review.isApproved = false;
      }
    }

    if (isAdmin && typeof isApproved === "boolean") {
      review.isApproved = isApproved;
    }

    const updated = await review.save();

    if (updated.course) await updateCourseRatingStats(updated.course);
    if (updated.product) await updateProductRatingStats(updated.product);
    if (updated.membership)
      await updateMembershipRatingStats(updated.membership);

    const populated = await populateReview(Review.findById(updated._id));

    return res.status(200).json({
      success: true,
      message: isAdmin
        ? "Review updated successfully."
        : "Review updated successfully. It will appear again after admin approval.",
      data: populated,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update review.",
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id.",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const isOwner = review.user.toString() === userId?.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review.",
      });
    }

    const courseId = review.course;
    const productId = review.product;

    const membershipId = review.membership;

    await review.deleteOne();

    if (courseId) await updateCourseRatingStats(courseId);
    if (productId) await updateProductRatingStats(productId);
    if (membershipId) await updateMembershipRatingStats(membershipId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const {
      q = "",
      status = "all",
      type = "all",
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};

    if (status === "approved") filter.isApproved = true;
    if (status === "pending") filter.isApproved = false;

    if (["course", "product", "membership"].includes(type)) {
      filter.reviewType = type;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
    const skip = (safePage - 1) * safeLimit;

    const search = normalizeText(q);

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
        { reviewType: { $regex: search, $options: "i" } },
      ];
    }

    const [reviews, total, stats] = await Promise.all([
      populateReview(
        Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: {
              $sum: {
                $cond: [{ $eq: ["$isApproved", true] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$isApproved", false] }, 1, 0],
              },
            },
            averageRating: { $avg: "$rating" },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin reviews fetched successfully.",
      data: reviews,
      meta: {
        total,
        page: safePage,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
        stats: {
          total: stats[0]?.total || 0,
          approved: stats[0]?.approved || 0,
          pending: stats[0]?.pending || 0,
          averageRating: Number((stats[0]?.averageRating || 0).toFixed(1)),
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin reviews.",
    });
  }
};

export const approveReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id.",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    review.isApproved = true;
    await review.save();

    if (review.course) await updateCourseRatingStats(review.course);
    if (review.product) await updateProductRatingStats(review.product);
    if (review.membership) await updateMembershipRatingStats(review.membership);

    const populated = await populateReview(Review.findById(review._id));

    return res.status(200).json({
      success: true,
      message: "Review approved successfully.",
      data: populated,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to approve review.",
    });
  }
};

export const unapproveReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id.",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    review.isApproved = false;
    await review.save();

    if (review.course) await updateCourseRatingStats(review.course);
    if (review.product) await updateProductRatingStats(review.product);
    if (review.membership) await updateMembershipRatingStats(review.membership);

    const populated = await populateReview(Review.findById(review._id));

    return res.status(200).json({
      success: true,
      message: "Review unapproved successfully.",
      data: populated,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to unapprove review.",
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
  unapproveReview,
};
