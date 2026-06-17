// controllers/enrollmentController.js
import mongoose from "mongoose";
import Stripe from "stripe";
import Course from "../models/CourseModel.js";
import Review from "../models/ReviewModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import WebhookEvent from "../models/WebhookEventModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

// eslint-disable-next-line no-undef
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * In-memory webhook dedupe.
 * This helps prevent duplicate processing when Stripe retries quickly.
 * For very large production scale, replace this with a WebhookEvent model in MongoDB.
 */
const processedStripeEvents = new Set();

function normalizeLevel(value) {
  const level = String(value || "")
    .trim()
    .toLowerCase();
  if (level === "advanced") return "advance";
  return level || "beginner";
}

function normalizePaymentPlan(value) {
  const plan = String(value || "one-time")
    .trim()
    .toLowerCase();

  if (plan === "one_time") return "one-time";
  if (plan === "one time") return "one-time";
  if (plan === "monthly") return "monthly";
  if (plan === "yearly") return "yearly";
  if (plan === "lifetime") return "lifetime";
  if (plan === "free") return "free";
  if (plan === "membership") return "membership";

  return "one-time";
}

function getStripeObjectId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || "";
}

function calculateExpiresAt(paymentPlan) {
  const plan = normalizePaymentPlan(paymentPlan);

  if (plan === "monthly") {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  if (plan === "yearly") {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  return null;
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

function isMembershipCheckout(session) {
  const checkoutKind = String(
    session?.metadata?.kind || session?.metadata?.type || "",
  )
    .trim()
    .toLowerCase();

  const plan = normalizePaymentPlan(
    session?.metadata?.paymentPlan ||
      session?.metadata?.billingPlan ||
      session?.metadata?.plan,
  );

  return checkoutKind === "membership" || plan === "membership";
}

function getSessionPaymentPlan(session) {
  return normalizePaymentPlan(
    session?.metadata?.paymentPlan ||
      session?.metadata?.billingPlan ||
      session?.metadata?.plan ||
      "one-time",
  );
}

function getSessionAmount(session) {
  return typeof session?.amount_total === "number"
    ? session.amount_total / 100
    : 0;
}

function getSessionCurrency(session) {
  return String(session?.currency || "usd").toUpperCase();
}

export const createEnrollment = async (req, res) => {
  try {
    const {
      user,
      course,
      pricePaid = 0,
      currency = "USD",
      paymentPlan = "one-time",
      paymentStatus = "paid",
      status = "active",
      accessType = "admin",
      expiresAt = null,
    } = req.body;

    if (!user || !course) {
      return res.status(400).json({
        success: false,
        message: "User and course are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(String(user)) ||
      !mongoose.Types.ObjectId.isValid(String(course))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID and course ID are required.",
      });
    }

    const existingEnrollment = await Enrollment.findOne({
      user,
      course,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: "This user is already enrolled in this course.",
      });
    }

    const enrollment = await Enrollment.create({
      user,
      course,
      pricePaid: Math.max(0, Number(pricePaid || 0)),
      currency: String(currency || "USD")
        .trim()
        .toUpperCase(),
      paymentPlan,
      paymentStatus,
      status,
      accessType,
      expiresAt: expiresAt || null,
      startedAt: new Date(),
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate("user", "name fullName email role")
      .populate("course", "title slug level category price salePrice isFree")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Enrollment created successfully.",
      data: populatedEnrollment,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate enrollment detected.",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors)[0]?.message || "Validation failed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create enrollment.",
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

    const now = new Date();

    const enrollments = await Enrollment.find({
      user: userId,
      status: { $nin: ["cancelled", "expired"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .populate(
        "course",
        `
          title slug thumbnail image coverImage photo shortDescription
          description category level requiredMembershipLevel instructor
          price salePrice isFree ratingAverage ratingCount studentsCount
          isFeatured allowSinglePurchase
        `,
      )
      .sort({ createdAt: -1 })
      .lean();

    const ownedCourseIds = new Set(
      enrollments
        .map((item) => item.course?._id)
        .filter(Boolean)
        .map(String),
    );

    const subscription = await UserSubscription.findOne({ user: userId })
      .select("membershipId accessLevel status currentPeriodEnd billingPeriod")
      .lean();

    let membershipCourses = [];

    if (isSubscriptionActive(subscription)) {
      const userLevel = normalizeLevel(
        subscription.accessLevel || subscription.membershipId,
      );

      membershipCourses = await Course.find({
        isPublished: true,
        isFree: { $ne: true },
        $or: [{ requiredMembershipLevel: userLevel }, { level: userLevel }],
      })
        .select(
          `
            title slug thumbnail image coverImage photo shortDescription
            description category level requiredMembershipLevel instructor
            price salePrice isFree ratingAverage ratingCount studentsCount
            isFeatured allowSinglePurchase
          `,
        )
        .lean();

      membershipCourses = membershipCourses.filter(
        (course) => !ownedCourseIds.has(String(course._id)),
      );
    }

    const virtualMembershipEnrollments = membershipCourses.map((course) => ({
      _id: `membership-${course._id}`,
      user: userId,
      course,
      pricePaid: 0,
      currency: "USD",
      paymentPlan: subscription.billingPeriod || "monthly",
      paymentStatus: "paid",
      status: "active",
      accessType: "membership",
      progressPercent: 0,
      startedAt:
        subscription.currentPeriodStart || subscription.createdAt || null,
      completedAt: null,
      expiresAt: subscription.currentPeriodEnd || null,
      lastAccessedAt: null,
      membershipAccess: {
        membershipId: subscription.membershipId,
        accessLevel: subscription.accessLevel,
        subscriptionStatus: subscription.status,
        billingPeriod: subscription.billingPeriod,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      createdAt: subscription.createdAt || new Date(),
      updatedAt: subscription.updatedAt || new Date(),
    }));

    const finalEnrollments = [...virtualMembershipEnrollments, ...enrollments];

    return res.status(200).json({
      success: true,
      count: finalEnrollments.length,
      data: finalEnrollments,
      enrollments: finalEnrollments,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments.",
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
      "_id title level requiredMembershipLevel isFree",
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
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (enrollment) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        accessType: enrollment.accessType || "single-course",
        isEnrolled: true,
        enrollmentId: enrollment._id,
        enrollment,
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        progressPercent: enrollment.progressPercent || 0,
      });
    }

    const subscription = await UserSubscription.findOne({
      user: userId,
    }).select(
      "_id membershipId accessLevel status currentPeriodEnd billingPeriod",
    );

    if (isSubscriptionActive(subscription)) {
      const requiredLevel = normalizeLevel(
        course.requiredMembershipLevel || course.level || "beginner",
      );

      const userLevel = normalizeLevel(
        subscription.accessLevel || subscription.membershipId,
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment status.",
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
      enrollment.status === "expired" ||
      enrollment.paymentStatus === "refunded" ||
      enrollment.paymentStatus !== "paid"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Enrollment is not active/paid.",
      });
    }

    if (
      enrollment.expiresAt &&
      new Date(enrollment.expiresAt).getTime() < Date.now()
    ) {
      enrollment.status = "expired";
      await enrollment.save();

      return res.status(403).json({
        success: false,
        message: "Access denied. Enrollment has expired.",
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment progress.",
    });
  }
};

export const getTopCoursesByEnrollments = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 3;

    const aggregation = await Enrollment.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          status: { $in: ["active", "completed"] },
        },
      },
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top courses.",
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
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).send("Webhook Error");
  }

  try {
    const existingEvent = await WebhookEvent.findOne({
      eventId: event.id,
    });

    if (existingEvent) {
      return res.status(200).json({
        received: true,
        duplicate: true,
      });
    }

    await WebhookEvent.create({
      eventId: event.id,
      eventType: event.type,
    });

    if (processedStripeEvents.size > 5000) {
      processedStripeEvents.clear();
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (isMembershipCheckout(session)) {
        return res.status(200).json({ received: true });
      }

      const userId = session?.metadata?.userId;
      const courseId = session?.metadata?.courseId;

      if (!userId || !courseId) {
        return res.status(200).json({ received: true });
      }

      const course = await Course.findById(courseId).select("_id");

      if (!course) {
        return res.status(200).json({ received: true });
      }

      const paymentPlan = getSessionPaymentPlan(session);
      const expiresAt = calculateExpiresAt(paymentPlan);

      await Enrollment.findOneAndUpdate(
        {
          user: userId,
          course: courseId,
        },
        {
          $setOnInsert: {
            user: userId,
            course: courseId,
            startedAt: new Date(),
          },
          $set: {
            pricePaid: getSessionAmount(session),
            currency: getSessionCurrency(session),
            paymentPlan,
            paymentStatus: "paid",
            status: "active",
            accessType: "single-course",
            stripeSessionId: session.id,
            stripePaymentIntentId: getStripeObjectId(session.payment_intent),
            stripeCustomerId: getStripeObjectId(session.customer),
            expiresAt,
            lastAccessedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      );
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = getStripeObjectId(charge.payment_intent);

      if (paymentIntentId) {
        await Enrollment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          {
            $set: {
              paymentStatus: "refunded",
              status: "cancelled",
            },
          },
          { new: true },
        );
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const paymentIntentId = getStripeObjectId(paymentIntent);

      if (paymentIntentId) {
        await Enrollment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          {
            $set: {
              paymentStatus: "failed",
              status: "cancelled",
            },
          },
          { new: true },
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Webhook handler failed.",
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
      expand: ["payment_intent", "subscription", "customer"],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Stripe session not found.",
      });
    }

    const isPaid =
      session.payment_status === "paid" && session.status === "complete";

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

    if (isMembershipCheckout(session)) {
      return res.status(403).json({
        success: false,
        message:
          "Membership subscriptions cannot create permanent enrollments.",
      });
    }

    const paymentPlan = getSessionPaymentPlan(session);
    const expiresAt = calculateExpiresAt(paymentPlan);

    const existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      paymentStatus: "paid",
      status: { $in: ["active", "completed"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
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
          startedAt: new Date(),
        },
        $set: {
          stripeSessionId: session.id,
          stripePaymentIntentId: getStripeObjectId(session.payment_intent),
          stripeCustomerId: getStripeObjectId(session.customer),
          pricePaid: getSessionAmount(session),
          currency: getSessionCurrency(session),
          paymentPlan,
          paymentStatus: "paid",
          status: "active",
          accessType: "single-course",
          expiresAt,
          lastAccessedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to verify enrollment right now.",
    });
  }
};

export const getAllEnrollmentsAdmin = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({})
      .populate("user", "name fullName email role")
      .populate("course", "title slug level category price salePrice isFree")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments.",
    });
  }
};

export const updateEnrollmentAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid enrollment ID is required.",
      });
    }

    const allowedFields = [
      "pricePaid",
      "currency",
      "paymentPlan",
      "paymentStatus",
      "status",
      "accessType",
      "rating",
      "review",
      "progressPercent",
      "startedAt",
      "completedAt",
      "expiresAt",
      "lastAccessedAt",
    ];

    const update = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid enrollment fields provided.",
      });
    }

    if (update.currency) {
      update.currency = String(update.currency).trim().toUpperCase();
    }

    if ("pricePaid" in update) {
      update.pricePaid = Math.max(0, Number(update.pricePaid || 0));
    }

    if ("progressPercent" in update) {
      update.progressPercent = Math.min(
        100,
        Math.max(0, Number(update.progressPercent || 0)),
      );
    }

    if ("review" in update) {
      update.review = String(update.review || "")
        .trim()
        .slice(0, 1000);
    }

    if ("rating" in update) {
      update.rating = update.rating ? Number(update.rating) : null;
    }

    if (update.progressPercent >= 100 && update.status !== "completed") {
      update.status = "completed";
      update.completedAt = update.completedAt || new Date();
    }

    if (update.status === "completed" && !update.completedAt) {
      update.completedAt = new Date();
    }

    const enrollment = await Enrollment.findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("user", "name fullName email role")
      .populate("course", "title slug level category price salePrice isFree");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment updated successfully.",
      data: enrollment,
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
      message: "Failed to update enrollment.",
    });
  }
};

export const deleteEnrollmentAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid enrollment ID is required.",
      });
    }

    const enrollment = await Enrollment.findByIdAndDelete(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment deleted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete enrollment.",
    });
  }
};
