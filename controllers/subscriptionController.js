// controllers/subscriptionController.js
import mongoose from "mongoose";
import { stripe } from "../config/stripe.js";
import Membership from "../models/MembershipModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import User from "../models/UserModel.js";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import Order from "../models/OrderModel.js";

// eslint-disable-next-line no-undef
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function normalizeStatus(status) {
  const allowed = new Set([
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "unpaid",
  ]);
  return allowed.has(status) ? status : "incomplete";
}

const isActiveStatus = (s) => s === "active" || s === "trialing";

/**
 * POST /api/v1/subscriptions/checkout
 * body: { membershipId: "beginner" | "intermediate" | "advance" | "complete", courseId?: "" }
 */
/**
 * POST /api/v1/subscriptions/checkout
 * body: { membershipId, billingPeriod: "monthly" | "yearly" }
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { membershipId, courseId } = req.body; // ✅ remove billingPeriod

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!membershipId) {
      return res.status(400).json({ success: false, message: "membershipId is required" });
    }

    // 1) Find membership
    const plan = await Membership.findOne({ membershipId, isPublished: true }).lean();
    if (!plan) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }

    // ✅ 2) ONLY monthly recurring price id (single source of truth)
    const priceId = String(plan.stripePriceId || "").trim();

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Stripe price id. Add stripePriceId (MONTHLY recurring Price ID) to this membership in MongoDB.",
      });
    }

    // 3) Load user
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // 4) Create stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(userId) },
    });

    // 5) Save local subscription as incomplete
    await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: plan._id,
          membershipId: plan.membershipId,
          stripeCustomerId: customer.id,
          stripePriceId: priceId,        // ✅ store the ACTUAL price used
          billingPeriod: "monthly",      // ✅ force monthly everywhere
          status: "incomplete",
        },
      },
      { upsert: true, new: true }
    );

    // 6) Stripe checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: String(userId),
        membershipId: plan.membershipId,
        billingPeriod: "monthly", // ✅ always monthly
        priceId: priceId,         // ✅ keep for webhook accuracy
        courseId: courseId || "",
      },
      success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/subscription/failed?canceled=true`,
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    return res.status(500).json({ success: false, message: "Could not create checkout session" });
  }
};

/**
 * POST /api/v1/subscriptions/webhook
 * Stripe webhook (raw body required)
 */
export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    // eslint-disable-next-line no-undef
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "subscription" && session.subscription) {
        const userId = session.metadata?.userId || session.client_reference_id;
        const membershipId = session.metadata?.membershipId;

        // ⚠️ this may be ObjectId OR slug depending on what you stored
        const courseId = session.metadata?.courseId || "";

        const plan = membershipId
          ? await Membership.findOne({ membershipId }).lean()
          : null;

        if (userId && plan) {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

          // 1) update DB subscription
          const subDoc = await UserSubscription.findOneAndUpdate(
            { user: userId },
            {
              $set: {
                membership: plan._id,
                membershipId: plan.membershipId,
                stripeCustomerId: session.customer || "",
                stripeSubscriptionId: stripeSub.id,
                stripePriceId: session.metadata?.priceId || plan.stripePriceId || "",
                status: normalizeStatus(stripeSub.status),
                currentPeriodStart: stripeSub.current_period_start
                  ? new Date(stripeSub.current_period_start * 1000)
                  : null,
                currentPeriodEnd: stripeSub.current_period_end
                  ? new Date(stripeSub.current_period_end * 1000)
                  : null,
                cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
              },
            },
            { upsert: true, new: true }
          );

          // 2) update user membership
          await User.findByIdAndUpdate(userId, {
            $set: { membershipPlan: plan.membershipId },
          });

          // 3) enrollment (optional) ✅ SAFE (ObjectId OR slug)
          let courseDoc = null;

          if (courseId) {
            if (mongoose.Types.ObjectId.isValid(courseId)) {
              courseDoc = await Course.findById(courseId).lean();
            } else {
              courseDoc = await Course.findOne({ slug: courseId }).lean();
            }

            if (courseDoc) {
              const existing = await Enrollment.findOne({
                user: userId,
                course: courseDoc._id, // ✅ always ObjectId
                status: { $ne: "cancelled" },
              });

              if (!existing) {
                await Enrollment.create({
                  user: userId,
                  course: courseDoc._id, // ✅ always ObjectId
                  pricePaid: courseDoc.price ?? 0,
                  currency: (session.currency || "usd").toUpperCase(),
                  paymentPlan: "monthly",
                  paymentStatus: "paid",
                  status: "active",
                  rating: 5,
                });
              }
            }
          }

          // 4) order (optional but recommended)
          try {
            const currency = (session.currency || "usd").toUpperCase();

            const items = [
              {
                productType: "subscription",
                product: subDoc?._id,
                productModel: "UserSubscription",
                title: plan.title || "Membership Subscription",
                quantity: 1,
                unitPrice: 0,
                currency,
              },
            ];

            if (courseDoc) {
              items.push({
                productType: "course",
                product: courseDoc._id,
                productModel: "Course",
                title: courseDoc.title,
                quantity: 1,
                unitPrice: courseDoc.price ?? 0,
                currency,
              });
            }

            await Order.create({
              user: userId,
              items,
              subtotal: items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
              discount: 0,
              total: items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0),
              currency,
              paymentStatus: "paid",
              paymentMethod: "stripe",
              transactionId: session.payment_intent || session.id || stripeSub.id,
              couponCode: "",
              note: "",
              status: "completed",
              isSeenByAdmin: false,
            });
          } catch (orderErr) {
            console.error("Order creation error in webhook:", orderErr);
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      await UserSubscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            status: normalizeStatus(sub.status),
            currentPeriodStart: sub.current_period_start
              ? new Date(sub.current_period_start * 1000)
              : null,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          },
        },
        { new: true }
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await UserSubscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        { $set: { status: "canceled", cancelAtPeriodEnd: false } },
        { new: true }
      );
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("stripeWebhook handler error:", err);
    return res.status(500).json({ success: false, message: "Webhook handler failed" });
  }
};

/**
 * GET /api/v1/subscriptions/me
 */
export const getMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const sub = await UserSubscription.findOne({ user: userId })
      .populate("membership", "membershipId title stripePriceId")
      .lean();

    if (!sub) {
      return res.status(200).json({
        success: true,
        data: {
          hasSubscription: false,
          isActive: false,
          status: "none",
          membershipId: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hasSubscription: true,
        isActive: isActiveStatus(sub.status),
        status: sub.status,
        membershipId: sub.membershipId,
        stripeSubscriptionId: sub.stripeSubscriptionId || null,
        currentPeriodStart: sub.currentPeriodStart || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
      },
    });
  } catch (err) {
    console.error("getMySubscription error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch subscription" });
  }
};

/**
 * GET /api/v1/subscriptions/confirm?session_id=cs_...
 * Used by SubscriptionSuccess page to decide where to go next
 */
export const confirmCheckoutSession = async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Auth required" });

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "session_id is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid =
      session &&
      session.status === "complete" &&
      session.payment_status === "paid";

    if (!isPaid) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: session?.status,
        payment_status: session?.payment_status,
      });
    }

    const metaUserId = session?.metadata?.userId;
    if (metaUserId && metaUserId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Session does not belong to this user" });
    }

    const courseMeta = session?.metadata?.courseId || ""; // may be ObjectId OR slug OR empty
    const membershipId = session?.metadata?.membershipId || "";

    // webhook may still be processing; check DB
    const subscription = await UserSubscription.findOne({ user: userId }).lean();

    // ✅ Resolve course safely (ObjectId or slug)
    let enrollment = null;
    let resolvedCourseId = "";

    if (courseMeta) {
      let courseDoc = null;

      // If metadata is a real ObjectId -> fetch by _id
      if (mongoose.Types.ObjectId.isValid(courseMeta)) {
        courseDoc = await Course.findById(courseMeta).select("_id").lean();
      } else {
        // Otherwise treat as slug
        courseDoc = await Course.findOne({ slug: courseMeta }).select("_id").lean();
      }

      if (courseDoc?._id) {
        resolvedCourseId = courseDoc._id.toString();

        // ✅ Now safe: query Enrollment.course using real ObjectId
        enrollment = await Enrollment.findOne({
          user: userId,
          course: courseDoc._id,
          status: { $ne: "cancelled" },
        }).lean();
      }
    }

    return res.status(200).json({
      success: true,
      paid: true,
      courseId: resolvedCourseId,          // ✅ always ObjectId (or "")
      courseMeta,                          // helpful debug (optional)
      membershipId,
      subscriptionReady: !!subscription,
      enrollmentReady: !!enrollment,
    });
  } catch (err) {
    console.error("confirmCheckoutSession error:", err);
    return res.status(500).json({ success: false, message: "Could not confirm session" });
  }
};
