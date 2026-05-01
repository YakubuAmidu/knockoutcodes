// controllers/enrollmentController.js
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import Stripe from "stripe";

// eslint-disable-next-line no-undef
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a single enrollment (for checkout / seeding / admin)
export const createEnrollment = async (req, res) => {
  try {
    const {
      course,
      pricePaid,
      currency,
      paymentPlan,
      paymentStatus,
      status,
      rating,
      review,
      user: bodyUser, // keep reading it, but we will restrict it
    } = req.body;

    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Only admins can create enrollments manually..."
      });
    }

    // Admin must specify which user to to enroll
    const userId = bodyUser;

    if (!userId || !course) {
      return res.status(400).json({
        success: false,
        message: "Admin must provide both user and course...",
      });
    }

    // Ensure course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // ✅ prevent duplicates
    const existing = await Enrollment.findOne({
      user: userId,
      course,
      status: { $ne: "cancelled" },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course.",
        enrollmentId: existing._id,
      });
    }

    // ✅ safer defaults (pro)
    // If you're not using Stripe webhook yet, keep "paid" for now.
    // Later we will enforce: only webhook can set paid.
    const enrollment = await Enrollment.create({
      user: userId,
      course,
      pricePaid:
        typeof pricePaid === "number" ? pricePaid : courseDoc.price ?? 0,
      currency: currency || "USD",
      paymentPlan: paymentPlan || "one-time",
      paymentStatus: paymentStatus || "paid",
      status: status || "active",
      rating: rating ?? 5,
      review: review || undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Enrollment created successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("createEnrollment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create enrollment.",
      error: error.message,
    });
  }
};

// Get enrollments for the current user (for "My Courses" page)
export const getMyEnrollments = async (req, res) => {
  try {
    // ✅ Only allow the authenticated user
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const enrollments = await Enrollment.find({
      user: userId,
      status: { $ne: "cancelled" }, // ✅ optional: hide cancelled
    })
      .populate("course", "title thumbnail level price salePrice isFree slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error("getMyEnrollments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments.",
      error: error.message,
    });
  }
};

// Check if the current user is enrolled in a given course
export const getEnrollmentStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { courseId } = req.params;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required and you must be logged in.",
      });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      status: { $ne: "cancelled" },
    });

    return res.status(200).json({
      success: true,
      isEnrolled: !!enrollment,
      enrollmentId: enrollment?._id,
      status: enrollment?.status,
      paymentStatus: enrollment?.paymentStatus,
      progressPercent: enrollment?.progressPercent,
    });
  } catch (error) {
    console.error("getEnrollmentStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment status.",
      error: error.message,
    });
  }
};

// Update enrollment progress for the current user
export const updateEnrollmentProgress = async (req, res) => {
  try {
    const { id } = req.params; // enrollmentId
    const { progressPercent, markCompleted } = req.body;

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const numericProgress = Number(progressPercent);
    if (
      Number.isNaN(numericProgress) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "progressPercent must be a number between 0 and 100.",
      });
    };
    
    const enrollment = await Enrollment.findOne({ _id: id, user: userId });

if (!enrollment) {
  return res.status(404).json({
    success: false,
    message: "Enrollment not found for this user.",
  });
}

// ✅ Block progress updates on cancelled/refunded/unpaid enrollments (pro)
if (
  enrollment.status === "cancelled" ||
  enrollment.paymentStatus === "refunded" ||
  enrollment.paymentStatus !== "paid"
) {
  return res.status(403).json({
    success: false,
    message: "Access denied. Enrollment is not active/paid.",
  });
}

// ✅ update startedAt/lastAccessedAt cleanly
if (!enrollment.startedAt) enrollment.startedAt = new Date();

    // Mark completed if requested or if >= 99.5%
    if (markCompleted || numericProgress >= 99.5) {
      enrollment.status = "completed";
      if (!enrollment.completedAt) {
        enrollment.completedAt = new Date();
      }
    } else if (enrollment.status === "completed" && numericProgress < 99.5) {
      // Optional: allow going back from completed to active
      enrollment.status = "active";
      enrollment.completedAt = enrollment.completedAt || null;
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Enrollment progress updated.",
      data: enrollment,
    });
  } catch (error) {
    console.error("updateEnrollmentProgress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment progress.",
      error: error.message,
    });
  }
};

// Top courses by number of enrollments + revenue + avg rating
export const getTopCoursesByEnrollments = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 3;

    const aggregation = await Enrollment.aggregate([
      {
        $group: {
          _id: "$course",
          enrollments: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          totalRevenue: { $sum: "$pricePaid" },
        },
      },
      { $sort: { enrollments: -1 } },
      { $limit: limit },
    ]);

    if (!aggregation.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const courseIds = aggregation.map((item) => item._id);

    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("title level price salePrice isFree")
      .lean();

    const courseMap = new Map();
    courses.forEach((c) => {
      courseMap.set(c._id.toString(), c);
    });

    const result = aggregation.map((item) => {
      const courseDoc = courseMap.get(item._id.toString());
      const avgRating =
        typeof item.avgRating === "number"
          ? Number(item.avgRating.toFixed(1))
          : 5;

      return {
        courseId: item._id,
        title: courseDoc?.title || "Untitled Course",
        level: courseDoc?.level || null,
        price: courseDoc?.price ?? null,
        salePrice: courseDoc?.salePrice ?? null,
        isFree: courseDoc?.isFree ?? false,
        enrollments: item.enrollments,
        avgRating,
        totalRevenue: item.totalRevenue || 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("getTopCoursesByEnrollments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top courses.",
      error: error.message,
    });
  }
};

export const stripeWebhookHandler = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body, // ⚠️ must be RAW body
      signature,
      // eslint-disable-next-line no-undef
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // ✅ Most common + correct event to create enrollment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // ✅ you MUST set these when creating checkout session:
      // metadata: { userId, courseId, paymentPlan }
      const userId = session?.metadata?.userId;
      const courseId = session?.metadata?.courseId;


      const billingPlan = session.metadata.billingPlan || "one_time";

      const paymentPlan = billingPlan === "one_time" ? "one_time" : billingPlan;

      if (!userId || !courseId) {
        console.error("Missing metadata userId/courseId on session:", session.id);
        return res.status(200).json({ received: true }); // don't retry forever
      }

      // ✅ Stripe sends cents
      const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : 0;
      const currency = (session.currency || "usd").toUpperCase();

      // ✅ Idempotent create: if already created, do nothing
      const existing = await Enrollment.findOne({ stripeSessionId: session.id });
      if (!existing) {
        await Enrollment.create({
          user: userId,
          course: courseId,
          pricePaid: amount,
          currency,
          paymentPlan,
          paymentStatus: "paid",
          status: "active",
          stripeSessionId: session.id,
        });
      }
    }

    // ✅ Always respond 200 quickly or Stripe retries
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripeWebhookHandler error:", error);
    // Stripe will retry if non-2xx, but keep this visible
    return res.status(500).json({ success: false, message: error.message });
  }
};
