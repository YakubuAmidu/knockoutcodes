// controllers/enrollmentController.js
import Stripe from "stripe";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

// eslint-disable-next-line no-undef
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

function hasMembershipExactAccess(userLevel, requiredLevel) {
  const cleanUserLevel = normalizeLevel(userLevel);
  const cleanRequiredLevel = normalizeLevel(requiredLevel);

  if (!cleanUserLevel || !cleanRequiredLevel) return false;

  return cleanUserLevel === cleanRequiredLevel;
}

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
      user: bodyUser,
    } = req.body;

    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Only admins can create enrollments manually.",
      });
    }

    if (!bodyUser || !course) {
      return res.status(400).json({
        success: false,
        message: "Admin must provide both user and course.",
      });
    }

    const courseDoc = await Course.findById(course);

    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        user: bodyUser,
        course,
      },
      {
        $setOnInsert: {
          user: bodyUser,
          course,
          startedAt: new Date(),
        },
        $set: {
          pricePaid: typeof pricePaid === "number" ? pricePaid : courseDoc.price ?? 0,
          currency: currency || "USD",
          paymentPlan: paymentPlan || "one-time",
          paymentStatus: paymentStatus || "paid",
          status: status || "active",
          rating: rating ?? 5,
          review: review || "",
          lastAccessedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Enrollment created successfully.",
      data: enrollment,
      enrollment,
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

export const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const enrollments = await Enrollment.find({
      user: userId,
      status: { $ne: "cancelled" },
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

export const getEnrollmentStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { courseId } = req.params;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required and you must be logged in.",
      });
    }

    const course = await Course.findById(courseId).select(
      "_id title level requiredMembershipLevel isFree"
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (course.isFree) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        accessType: "free",
        isEnrolled: true,
        status: "active",
        paymentStatus: "paid",
      });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: course._id,
      paymentStatus: "paid",
      status: { $in: ["active", "completed"] },
    });

    if (enrollment) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        accessType: "single-course",
        isEnrolled: true,
        enrollmentId: enrollment._id,
        enrollment,
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        progressPercent: enrollment.progressPercent || 0,
      });
    }

    const subscription = await UserSubscription.findOne({ user: userId }).select(
      "_id membershipId accessLevel status currentPeriodEnd billingPeriod"
    );

    if (isSubscriptionActive(subscription)) {
      const requiredLevel = normalizeLevel(
        course.requiredMembershipLevel || course.level || "beginner"
      );

      const userLevel = normalizeLevel(
        subscription.accessLevel || subscription.membershipId
      );

      if (hasMembershipExactAccess(userLevel, requiredLevel)) {
        return res.status(200).json({
          success: true,
          hasAccess: true,
          accessType: "membership",
          isEnrolled: true,
          status: "active",
          paymentStatus: "paid",
          requiredMembershipLevel: requiredLevel,
          membershipAccess: {
            membershipId: subscription.membershipId,
            accessLevel: subscription.accessLevel,
            subscriptionStatus: subscription.status,
            billingPeriod: subscription.billingPeriod,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
        });
      }

      return res.status(200).json({
        success: true,
        hasAccess: false,
        isEnrolled: false,
        accessType: null,
        reason: "membership_level_too_low",
        requiredMembershipLevel: requiredLevel,
        userMembershipLevel: userLevel,
      });
    }

    return res.status(200).json({
      success: true,
      hasAccess: false,
      isEnrolled: false,
      accessType: null,
      requiredMembershipLevel:
        course.requiredMembershipLevel || course.level || "beginner",
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

export const updateEnrollmentProgress = async (req, res) => {
  try {
    const { id } = req.params;
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
    }

    const enrollment = await Enrollment.findOne({ _id: id, user: userId });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found for this user.",
      });
    }

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

    if (!enrollment.startedAt) enrollment.startedAt = new Date();

    enrollment.progressPercent = numericProgress;
    enrollment.lastAccessedAt = new Date();

    if (markCompleted || numericProgress >= 99.5) {
      enrollment.status = "completed";
      enrollment.completedAt = enrollment.completedAt || new Date();
    } else if (enrollment.status === "completed" && numericProgress < 99.5) {
      enrollment.status = "active";
      enrollment.completedAt = null;
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Enrollment progress updated.",
      data: enrollment,
      enrollment,
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

    courses.forEach((course) => {
      courseMap.set(course._id.toString(), course);
    });

    const result = aggregation.map((item) => {
      const courseDoc = courseMap.get(item._id.toString());

      return {
        courseId: item._id,
        title: courseDoc?.title || "Untitled Course",
        level: courseDoc?.level || null,
        price: courseDoc?.price ?? null,
        salePrice: courseDoc?.salePrice ?? null,
        isFree: courseDoc?.isFree ?? false,
        enrollments: item.enrollments,
        avgRating:
          typeof item.avgRating === "number"
            ? Number(item.avgRating.toFixed(1))
            : 5,
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
      req.body,
      signature,
      // eslint-disable-next-line no-undef
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session?.metadata?.userId;
      const courseId = session?.metadata?.courseId;

      if (!userId || !courseId) {
        return res.status(200).json({ received: true });
      }

      const amount =
        typeof session.amount_total === "number" ? session.amount_total / 100 : 0;

      const currency = (session.currency || "usd").toUpperCase();

      const rawPlan =
        session.metadata?.paymentPlan ||
        session.metadata?.billingPlan ||
        session.metadata?.plan ||
        "one-time";

      const paymentPlan = rawPlan === "one_time" ? "one-time" : rawPlan;

      await Enrollment.findOneAndUpdate(
        {
          user: userId,
          course: courseId,
        },
        {
          $setOnInsert: {
            user: userId,
            course: courseId,
            pricePaid: amount,
            currency,
            paymentPlan,
            stripeSessionId: session.id,
            startedAt: new Date(),
          },
          $set: {
            paymentStatus: "paid",
            status: "active",
            lastAccessedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripeWebhookHandler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyStripeEnrollment = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { courseId, session_id } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated.",
      });
    }

    if (!courseId || !session_id) {
      return res.status(400).json({
        success: false,
        message: "Course ID and Stripe session ID are required.",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "subscription"],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Stripe session not found.",
      });
    }

    const isPaid =
  session.payment_status === "paid" &&
  session.status === "complete";

    if (!isPaid) {
      return res.status(400).json({
        success: false,
        message: "Payment is not fully verified yet.",
      });
    }

    const sessionUserId = session.metadata?.userId;

    if (sessionUserId && String(sessionUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Payment does not belong to this user.",
      });
    }

    const sessionCourseId = session.metadata?.courseId;

    if (sessionCourseId && String(sessionCourseId) !== String(courseId)) {
      return res.status(403).json({
        success: false,
        message: "Payment does not match this course.",
      });
    }

    const checkoutKind = String(
  session.metadata?.kind || session.metadata?.type || ""
)
  .trim()
  .toLowerCase();

if (checkoutKind === "membership") {
  return res.status(403).json({
    success: false,
    message:
      "Membership subscriptions cannot create permanent enrollments.",
  });
}

    const amount =
      typeof session.amount_total === "number" ? session.amount_total / 100 : 0;

    const rawPlan =
      session.metadata?.paymentPlan ||
      session.metadata?.billingPlan ||
      session.metadata?.plan ||
      "one-time";

    const paymentPlan = rawPlan === "one_time" ? "one-time" : rawPlan;

    const existingEnrollment = await Enrollment.findOne({
  user: userId,
  course: courseId,
  paymentStatus: "paid",
  status: { $in: ["active", "completed"] },
});

if (existingEnrollment) {
  return res.status(200).json({
    success: true,
    message: "Enrollment already exists.",
    enrollment: existingEnrollment,
    data: {
      enrollment: existingEnrollment,
    },
    isEnrolled: true,
    hasAccess: true,
    status: existingEnrollment.status,
    paymentStatus: existingEnrollment.paymentStatus,
  });
}

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        user: userId,
        course: courseId,
      },
      {
        $setOnInsert: {
          user: userId,
          course: courseId,
          stripeSessionId: session.id,
          pricePaid: amount,
          currency: session.currency?.toUpperCase() || "USD",
          paymentPlan,
          startedAt: new Date(),
        },
        $set: {
          paymentStatus: "paid",
          status: "active",
          lastAccessedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Enrollment verified successfully.",
      enrollment,
      data: {
        enrollment,
      },
      isEnrolled: true,
      hasAccess: true,
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
    });
  } catch (error) {
    console.error("VERIFY STRIPE ENROLLMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify enrollment right now.",
      error: error.message,
    });
  }
};