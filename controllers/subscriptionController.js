// controllers/subscriptionController.js
import mongoose from "mongoose";
import { stripe } from "../config/stripe.js";
import Membership from "../models/MembershipModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import User from "../models/UserModel.js";
import Course from "../models/CourseModel.js";
import Order from "../models/OrderModel.js";
import WebhookEvent from "../models/WebhookEventModel.js";

// eslint-disable-next-line no-undef
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const VALID_MEMBERSHIP_LEVELS = [
  "beginner",
  "intermediate",
  "advance",
  "complete",
];

const VALID_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
];

function normalizeStatus(status) {
  const safeStatus = String(status || "").trim().toLowerCase();

  return VALID_SUBSCRIPTION_STATUSES.includes(safeStatus)
    ? safeStatus
    : "incomplete";
}

const isActiveStatus = (status) =>
  ["active", "trialing"].includes(String(status || "").trim().toLowerCase());

function normalizeBillingPeriod(value) {
  return String(value || "").trim().toLowerCase() === "yearly"
    ? "yearly"
    : "monthly";
}

function normalizeMembershipId(value) {
  const clean = String(value || "").trim().toLowerCase();

  if (!clean) return "";
  if (clean === "advanced") return "advance";

  if (clean.includes("beginner")) return "beginner";
  if (clean.includes("intermediate")) return "intermediate";
  if (clean.includes("advance") || clean.includes("advanced")) return "advance";
  if (clean.includes("complete") || clean.includes("elite")) return "complete";

  return clean;
}

function isValidMembershipLevel(value) {
  return VALID_MEMBERSHIP_LEVELS.includes(normalizeMembershipId(value));
}

function getStripePriceId(plan, billingPeriod) {
  if (!plan) return "";

  if (normalizeBillingPeriod(billingPeriod) === "yearly") {
    return String(
      plan.stripePriceIdYearly ||
        plan.stripeYearlyPriceId ||
        plan.yearlyStripePriceId ||
        ""
    ).trim();
  }

  return String(
    plan.stripePriceIdMonthly ||
      plan.stripeMonthlyPriceId ||
      plan.monthlyStripePriceId ||
      plan.stripePriceId ||
      ""
  ).trim();
}

async function findMembershipPlan(rawMembershipId) {
  const raw = String(rawMembershipId || "").trim().toLowerCase();
  const safeLevel = normalizeMembershipId(raw);

  if (!raw) return null;

  let plan = null;

  if (mongoose.Types.ObjectId.isValid(raw)) {
    plan = await Membership.findOne({
      _id: raw,
      isPublished: true,
    }).lean();
  }

  if (!plan) {
    plan = await Membership.findOne({
      isPublished: true,
      $or: [
        { membershipId: raw },
        { membershipId: safeLevel },
        { accessLevel: raw },
        { accessLevel: safeLevel },
        { slug: raw },
        { slug: safeLevel },
      ],
    }).lean();
  }

  if (!plan && safeLevel) {
    plan = await Membership.findOne({
      isPublished: true,
      $or: [
        { membershipId: safeLevel },
        { accessLevel: safeLevel },
        { slug: { $regex: safeLevel, $options: "i" } },
      ],
    }).lean();
  }

  return plan;
}

async function findCourseByIdOrSlug(courseId) {
  const safeCourseId = String(courseId || "").trim();

  if (!safeCourseId) return null;

  if (mongoose.Types.ObjectId.isValid(safeCourseId)) {
    return Course.findById(safeCourseId).lean();
  }

  return Course.findOne({ slug: safeCourseId }).lean();
}

async function saveWebhookEvent(event) {
  try {
    await WebhookEvent.create({
      eventId: event.id,
      eventType: event.type,
    });

    return true;
  } catch (err) {
    if (err?.code === 11000) {
      return false;
    }

    throw err;
  }
}

async function syncUserMembershipPlan(userId, status, membershipLevel) {
  if (!userId) return;

  await User.findByIdAndUpdate(userId, {
    $set: {
      membershipPlan: isActiveStatus(status) ? membershipLevel : null,
    },
  });
}

export const createCheckoutSession = async (req, res) => {
  try {
    const { membershipId, courseId, billingPeriod: rawBillingPeriod } = req.body;

    const billingPeriod = normalizeBillingPeriod(rawBillingPeriod);
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: "membershipId is required.",
      });
    }

    const plan = await findMembershipPlan(membershipId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Membership not found.",
      });
    }

    const safeMembershipId = normalizeMembershipId(
      plan.accessLevel || plan.membershipId || plan.slug || membershipId
    );

    if (!isValidMembershipLevel(safeMembershipId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership access level. Use beginner, intermediate, advance, or complete.",
      });
    }

    const priceId = getStripePriceId(plan, billingPeriod);

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: `Missing Stripe ${billingPeriod} price id for this membership.`,
      });
    }

    const existingSub = await UserSubscription.findOne({ user: userId }).lean();

    if (
      existingSub &&
      isActiveStatus(existingSub.status) &&
      existingSub.membershipId === safeMembershipId &&
      existingSub.billingPeriod === billingPeriod
    ) {
      return res.status(409).json({
        success: false,
        alreadySubscribed: true,
        message: "You are already subscribed to this membership.",
        data: existingSub,
      });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    let customerId = existingSub?.stripeCustomerId || "";

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.fullName || "",
        metadata: {
          userId: String(userId),
        },
      });

      customerId = customer.id;
    }

    await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: plan._id,
          membershipId: safeMembershipId,
          accessLevel: safeMembershipId,
          stripeCustomerId: customerId,
          stripePriceId: priceId,
          billingPeriod,
          status: "incomplete",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const safeCourseId = courseId ? String(courseId).trim() : "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: "subscription",
        kind: "membership",
        userId: String(userId),
        membershipId: safeMembershipId,
        billingPeriod,
        plan: billingPeriod,
        priceId,
        courseId: safeCourseId,
      },
      success_url:
        `${FRONTEND_URL}/subscription/success` +
        `?session_id={CHECKOUT_SESSION_ID}` +
        `&kind=membership` +
        `&courseId=${encodeURIComponent(safeCourseId)}` +
        `&plan=${encodeURIComponent(billingPeriod)}`,
      cancel_url: `${FRONTEND_URL}/subscription/failed?canceled=true&kind=membership`,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      id: session.id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Could not create checkout session.",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    // eslint-disable-next-line no-undef
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      return res.status(500).send("Webhook configuration error.");
    }

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    const existingEvent = await WebhookEvent.findOne({
      eventId: event.id,
    }).lean();

    if (existingEvent) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }
  } catch {
    return res.status(400).send("Webhook Error");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (
        session.mode === "payment" &&
        (session.metadata?.type === "products" ||
          session.metadata?.kind === "products")
      ) {
        const userId = session.metadata?.userId || session.client_reference_id;

        if (!userId) {
            return res.status(200).json({ received: true });
        } else {
          const existingOrder = await Order.findOne({
            stripeSessionId: session.id,
          }).lean();

          if (!existingOrder) {
            const customerDetails = session.customer_details || {};
            const address = customerDetails.address || {};

            let parsedItems = [];

            try {
              parsedItems = JSON.parse(session.metadata?.items || "[]");
            } catch {
              parsedItems = [];
            }

            if (Array.isArray(parsedItems) && parsedItems.length) {
              const productIds = parsedItems
                .map((item) => item.productId)
                .filter(Boolean);

              const products = await mongoose.model("Product").find({
                _id: { $in: productIds },
                isDeleted: false,
                isActive: true,
              });

              const orderItems = [];
              let subtotal = 0;
              const currency = (session.currency || "usd").toUpperCase();

              for (const cartItem of parsedItems) {
                const product = products.find(
                  (p) => String(p._id) === String(cartItem.productId)
                );

                if (!product) continue;

                const qty = Math.max(1, parseInt(cartItem.qty || 1, 10));

                if (Number(product.stock || 0) < qty) {                  continue;
                }

                const unitPrice = Number(product.price || 0);
                const lineTotal = unitPrice * qty;

                subtotal += lineTotal;

                orderItems.push({
                  productType: "product",
                  product: product._id,
                  productModel: "Product",
                  title: product.title,
                  quantity: qty,
                  unitPrice,
                  currency,
                });

                product.stock = Math.max(0, Number(product.stock || 0) - qty);
                await product.save();
              }

              if (orderItems.length) {
                await Order.create({
                  user: userId,
                  stripeSessionId: session.id,
                  items: orderItems,
                  subtotal,
                  discount: 0,
                  total: subtotal,
                  currency,
                  paymentStatus: "paid",
                  paymentMethod: "stripe",
                  transactionId: session.payment_intent || session.id,
                  couponCode: "",
                  note: "",
                  status: "processing",
                  isSeenByAdmin: false,

                  shippingAddress: {
                    fullName: customerDetails.name || "",
                    email: customerDetails.email || "",
                    phone: customerDetails.phone || "",
                    line1: address.line1 || "",
                    line2: address.line2 || "",
                    city: address.city || "",
                    state: address.state || "",
                    postalCode: address.postal_code || "",
                    country: address.country || "",
                  },

                  shipping: {
                    required: true,
                    carrier: "",
                    trackingNumber: "",
                    trackingUrl: "",
                    shippedAt: null,
                    deliveredAt: null,
                  },
                });
              }
            }
          }
        }
      }

      if (session.mode === "subscription" && session.subscription) {
        const existingSubscriptionOrder = await Order.findOne({
          stripeSessionId: session.id,
        }).lean();

        if (!existingSubscriptionOrder) {
          const userId = session.metadata?.userId || session.client_reference_id;
          const membershipId = normalizeMembershipId(
            session.metadata?.membershipId
          );
          const courseId = session.metadata?.courseId || "";

          const plan = await findMembershipPlan(membershipId);

          if (!userId || !plan) {
              // Missing user or membership plan. Skip subscription order creation.
          } else {
            const safeMembershipId = normalizeMembershipId(
              plan.accessLevel || plan.membershipId || plan.slug || membershipId
            );

            if (!isValidMembershipLevel(safeMembershipId)) {
  return res.status(200).json({ received: true });
} else {
              const stripeSub = await stripe.subscriptions.retrieve(
                session.subscription
              );

              const finalStatus = normalizeStatus(stripeSub.status);

              const subDoc = await UserSubscription.findOneAndUpdate(
                { user: userId },
                {
                  $set: {
                    membership: plan._id,
                    membershipId: safeMembershipId,
                    accessLevel: safeMembershipId,
                    stripeCustomerId: String(session.customer || ""),
                    stripeSubscriptionId: stripeSub.id,
                    stripePriceId:
                      session.metadata?.priceId ||
                      getStripePriceId(plan, session.metadata?.billingPeriod) ||
                      "",
                    billingPeriod: normalizeBillingPeriod(
                      session.metadata?.billingPeriod
                    ),
                    status: finalStatus,
                    currentPeriodStart: stripeSub.current_period_start
                      ? new Date(stripeSub.current_period_start * 1000)
                      : null,
                    currentPeriodEnd: stripeSub.current_period_end
                      ? new Date(stripeSub.current_period_end * 1000)
                      : null,
                    cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
                  },
                },
                {
                  upsert: true,
                  new: true,
                  runValidators: true,
                  setDefaultsOnInsert: true,
                }
              );

              await syncUserMembershipPlan(
                userId,
                finalStatus,
                safeMembershipId
              );

              const courseDoc = await findCourseByIdOrSlug(courseId);
              const currency = (session.currency || "usd").toUpperCase();
              const membershipPrice = session.amount_total
                ? Number(session.amount_total) / 100
                : 0;

              const items = [
                {
                  productType: "subscription",
                  product: subDoc?._id,
                  productModel: "UserSubscription",
                  title: plan.title || "Membership Subscription",
                  quantity: 1,
                  unitPrice: membershipPrice,
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
                  unitPrice: 0,
                  currency,
                });
              }

              await Order.create({
                user: userId,
                stripeSessionId: session.id,
                items,
                subtotal: membershipPrice,
                discount: 0,
                total: membershipPrice,
                currency,
                paymentStatus: "paid",
                paymentMethod: "stripe",
                transactionId:
                  session.payment_intent || session.id || stripeSub.id,
                couponCode: "",
                note: "",
                status: "completed",
                isSeenByAdmin: false,
              });
            }
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const finalStatus = normalizeStatus(sub.status);

      const subscription = await UserSubscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            status: finalStatus,
            currentPeriodStart: sub.current_period_start
              ? new Date(sub.current_period_start * 1000)
              : null,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (subscription?.user) {
        await syncUserMembershipPlan(
          subscription.user,
          finalStatus,
          subscription.accessLevel
        );
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;

      const subscription = await UserSubscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            status: "canceled",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (subscription?.user) {
        await syncUserMembershipPlan(subscription.user, "canceled", null);
      }
    }

    await saveWebhookEvent(event);

    return res.json({
      received: true,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Webhook handler failed.",
    });
  }
};

export const getMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const sub = await UserSubscription.findOne({ user: userId }).populate(
      "membership",
      "membershipId accessLevel title stripePriceId stripePriceIdMonthly stripePriceIdYearly"
    );

    if (!sub) {
      return res.status(200).json({
        success: true,
        data: {
          hasSubscription: false,
          isActive: false,
          status: "none",
          membershipId: null,
          accessLevel: null,
        },
      });
    }

    const isActive =
      typeof sub.isActive === "function"
        ? sub.isActive()
        : isActiveStatus(sub.status);

    return res.status(200).json({
      success: true,
      data: {
        hasSubscription: true,
        isActive,
        status: sub.status,
        membershipId: sub.membershipId,
        accessLevel: sub.accessLevel,
        billingPeriod: sub.billingPeriod,
        stripeSubscriptionId: sub.stripeSubscriptionId || null,
        currentPeriodStart: sub.currentPeriodStart || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        membership: sub.membership || null,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription.",
    });
  }
};

export const confirmCheckoutSession = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Auth required.",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "session_id is required.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid =
      session?.status === "complete" && session?.payment_status === "paid";

    if (!isPaid) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: session?.status,
        paymentStatus: session?.payment_status,
      });
    }

    const metaUserId = session?.metadata?.userId || "";

    if (metaUserId && String(metaUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Session does not belong to this user.",
      });
    }

    const membershipId = normalizeMembershipId(session?.metadata?.membershipId);
    const billingPeriod = normalizeBillingPeriod(
      session?.metadata?.billingPeriod || session?.metadata?.plan
    );

    const priceId = session?.metadata?.priceId || "";
    const stripeSubscriptionId = session?.subscription || "";
    const stripeCustomerId = session?.customer || "";

    const plan = await findMembershipPlan(membershipId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        paid: true,
        message: "Membership plan not found after payment.",
      });
    }

    const safeMembershipId = normalizeMembershipId(
      plan.accessLevel || plan.membershipId || membershipId
    );

    if (!isValidMembershipLevel(safeMembershipId)) {
      return res.status(400).json({
        success: false,
        paid: true,
        message: "Invalid membership level after payment.",
      });
    }

    let stripeSub = null;

    if (stripeSubscriptionId) {
      stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    }

    const finalStatus = normalizeStatus(stripeSub?.status || "active");

    const subDoc = await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: plan._id,
          membershipId: safeMembershipId,
          accessLevel: safeMembershipId,
          billingPeriod,
          stripeCustomerId: String(stripeCustomerId || ""),
          stripeSubscriptionId: String(stripeSubscriptionId || ""),
          stripePriceId: String(priceId || getStripePriceId(plan, billingPeriod)),
          status: finalStatus,
          currentPeriodStart: stripeSub?.current_period_start
            ? new Date(stripeSub.current_period_start * 1000)
            : null,
          currentPeriodEnd: stripeSub?.current_period_end
            ? new Date(stripeSub.current_period_end * 1000)
            : null,
          cancelAtPeriodEnd: Boolean(stripeSub?.cancel_at_period_end),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    await syncUserMembershipPlan(userId, finalStatus, safeMembershipId);

    return res.status(200).json({
      success: true,
      paid: true,
      kind: "membership",
      subscriptionReady: true,
      enrollmentReady: false,
      membershipId: safeMembershipId,
      accessLevel: safeMembershipId,
      billingPeriod,
      subscription: subDoc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Could not confirm session.",
    });
  }
};

export const switchMembershipPlan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { membershipId, billingPeriod: rawBillingPeriod } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: "membershipId is required.",
      });
    }

    const billingPeriod = normalizeBillingPeriod(rawBillingPeriod);
    const currentSub = await UserSubscription.findOne({ user: userId });

    if (!currentSub || !currentSub.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found. Please start a membership first.",
      });
    }

    if (!isActiveStatus(currentSub.status)) {
      return res.status(400).json({
        success: false,
        message: "Your current subscription is not active.",
      });
    }

    const newPlan = await findMembershipPlan(membershipId);

    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: "Membership plan not found.",
      });
    }

    const newMembershipId = normalizeMembershipId(
      newPlan.accessLevel || newPlan.membershipId || newPlan.slug
    );

    if (!isValidMembershipLevel(newMembershipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership level.",
      });
    }

    const newPriceId = getStripePriceId(newPlan, billingPeriod);

    if (!newPriceId) {
      return res.status(400).json({
        success: false,
        message: `Missing Stripe ${billingPeriod} price id for this membership.`,
      });
    }

    if (
      currentSub.membershipId === newMembershipId &&
      currentSub.billingPeriod === billingPeriod
    ) {
      return res.status(409).json({
        success: false,
        alreadySubscribed: true,
        message: "You are already subscribed to this membership plan.",
      });
    }

    const stripeSub = await stripe.subscriptions.retrieve(
      currentSub.stripeSubscriptionId
    );

    if (
      stripeSub.customer &&
      currentSub.stripeCustomerId &&
      String(stripeSub.customer) !== String(currentSub.stripeCustomerId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Subscription ownership verification failed.",
      });
    }

    const subscriptionItemId = stripeSub?.items?.data?.[0]?.id;

    if (!subscriptionItemId) {
      return res.status(400).json({
        success: false,
        message: "Stripe subscription item was not found.",
      });
    }

    const updatedStripeSub = await stripe.subscriptions.update(
      currentSub.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        metadata: {
          userId: String(userId),
          membershipId: newMembershipId,
          billingPeriod,
          kind: "membership",
        },
      }
    );

    const finalStatus = normalizeStatus(updatedStripeSub.status);

    const updatedSub = await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: newPlan._id,
          membershipId: newMembershipId,
          accessLevel: newMembershipId,
          billingPeriod,
          stripePriceId: newPriceId,
          status: finalStatus,
          currentPeriodStart: updatedStripeSub.current_period_start
            ? new Date(updatedStripeSub.current_period_start * 1000)
            : null,
          currentPeriodEnd: updatedStripeSub.current_period_end
            ? new Date(updatedStripeSub.current_period_end * 1000)
            : null,
          cancelAtPeriodEnd: Boolean(updatedStripeSub.cancel_at_period_end),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    await syncUserMembershipPlan(userId, finalStatus, newMembershipId);

    return res.status(200).json({
      success: true,
      message: "Membership switched successfully.",
      data: updatedSub,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Could not switch membership.",
    });
  }
};

export const cancelMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const sub = await UserSubscription.findOne({ user: userId });

    if (!sub || !sub.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: "No subscription found.",
      });
    }

    if (sub.status === "canceled") {
      return res.status(409).json({
        success: false,
        message: "This subscription is already canceled.",
      });
    }

    const existingStripeSub = await stripe.subscriptions.retrieve(
      sub.stripeSubscriptionId
    );

    if (
      existingStripeSub.customer &&
      sub.stripeCustomerId &&
      String(existingStripeSub.customer) !== String(sub.stripeCustomerId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Subscription ownership verification failed.",
      });
    }

    const stripeSub = await stripe.subscriptions.update(existingStripeSub.id, {
      cancel_at_period_end: true,
    });

    const updatedSub = await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          status: normalizeStatus(stripeSub.status),
          cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
          currentPeriodEnd: stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000)
            : sub.currentPeriodEnd,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    return res.status(200).json({
      success: true,
      message:
        "Your membership will stay active until the end of your current billing period.",
      data: updatedSub,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Could not cancel subscription.",
    });
  }
};

export const getAllSubscriptionsAdmin = async (_req, res) => {
  try {
    const subscriptions = await UserSubscription.find({})
      .populate("user", "name fullName email role")
      .populate(
        "membership",
        "title membershipId accessLevel billingPeriod price monthlyPrice yearlyPrice"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions.",
    });
  }
};

export const createSubscriptionAdmin = async (req, res) => {
  try {
    const {
      user,
      membership,
      membershipId,
      accessLevel,
      billingPeriod = "monthly",
      status = "active",
      stripeCustomerId = "",
      stripeSubscriptionId = "",
      stripePriceId = "",
      currentPeriodStart = null,
      currentPeriodEnd = null,
      cancelAtPeriodEnd = false,
    } = req.body;

    if (!user || !membership) {
      return res.status(400).json({
        success: false,
        message: "User and membership are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(String(user)) ||
      !mongoose.Types.ObjectId.isValid(String(membership))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID and membership ID are required.",
      });
    }

    const [existingSub, existingUser, membershipDoc] = await Promise.all([
      UserSubscription.findOne({ user }).lean(),
      User.findById(user).lean(),
      Membership.findById(membership).lean(),
    ]);

    if (existingSub) {
      return res.status(409).json({
        success: false,
        message: "This user already has a subscription.",
      });
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!membershipDoc) {
      return res.status(404).json({
        success: false,
        message: "Membership not found.",
      });
    }

    const safeLevel = normalizeMembershipId(
      accessLevel ||
        membershipId ||
        membershipDoc.accessLevel ||
        membershipDoc.membershipId ||
        membershipDoc.slug
    );

    if (!isValidMembershipLevel(safeLevel)) {
      return res.status(400).json({
        success: false,
        message: "Valid membership level is required.",
      });
    }

    const safeStatus = normalizeStatus(status);

    const subscription = await UserSubscription.create({
      user,
      membership,
      membershipId: safeLevel,
      accessLevel: safeLevel,
      billingPeriod: normalizeBillingPeriod(billingPeriod),
      status: safeStatus,
      stripeCustomerId: String(stripeCustomerId || "").trim(),
      stripeSubscriptionId: String(stripeSubscriptionId || "").trim(),
      stripePriceId: String(stripePriceId || "").trim(),
      currentPeriodStart: currentPeriodStart || null,
      currentPeriodEnd: currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
    });

    await syncUserMembershipPlan(user, safeStatus, safeLevel);

    const populatedSubscription = await UserSubscription.findById(subscription._id)
      .populate("user", "name fullName email role")
      .populate(
        "membership",
        "title membershipId accessLevel billingPeriod price monthlyPrice yearlyPrice"
      )
      .lean();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully.",
      data: populatedSubscription,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate subscription detected.",
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || "Validation failed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create subscription.",
    });
  }
};

export const updateSubscriptionAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required.",
      });
    }

    const allowedFields = [
      "membership",
      "membershipId",
      "accessLevel",
      "billingPeriod",
      "status",
      "stripeCustomerId",
      "stripeSubscriptionId",
      "stripePriceId",
      "currentPeriodStart",
      "currentPeriodEnd",
      "cancelAtPeriodEnd",
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
        message: "No valid subscription fields provided.",
      });
    }

    if ("membership" in update) {
      if (!mongoose.Types.ObjectId.isValid(String(update.membership))) {
        return res.status(400).json({
          success: false,
          message: "Valid membership ID is required.",
        });
      }

      const membershipDoc = await Membership.findById(update.membership).lean();

      if (!membershipDoc) {
        return res.status(404).json({
          success: false,
          message: "Membership not found.",
        });
      }

      const derivedLevel = normalizeMembershipId(
        membershipDoc.accessLevel ||
          membershipDoc.membershipId ||
          membershipDoc.slug
      );

      if (!isValidMembershipLevel(derivedLevel)) {
        return res.status(400).json({
          success: false,
          message: "Selected membership has an invalid access level.",
        });
      }

      update.membershipId = update.membershipId || derivedLevel;
      update.accessLevel = update.accessLevel || derivedLevel;
    }

    if ("membershipId" in update) {
      update.membershipId = normalizeMembershipId(update.membershipId);
    }

    if ("accessLevel" in update) {
      update.accessLevel = normalizeMembershipId(update.accessLevel);
    }

    if (!update.accessLevel && update.membershipId) {
      update.accessLevel = update.membershipId;
    }

    if (!update.membershipId && update.accessLevel) {
      update.membershipId = update.accessLevel;
    }

    if (
      ("membershipId" in update && !isValidMembershipLevel(update.membershipId)) ||
      ("accessLevel" in update && !isValidMembershipLevel(update.accessLevel))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid membership level is required.",
      });
    }

    if ("billingPeriod" in update) {
      update.billingPeriod = normalizeBillingPeriod(update.billingPeriod);
    }

    if ("status" in update) {
      update.status = normalizeStatus(update.status);
    }

    if ("stripeCustomerId" in update) {
      update.stripeCustomerId = String(update.stripeCustomerId || "").trim();
    }

    if ("stripeSubscriptionId" in update) {
      update.stripeSubscriptionId = String(
        update.stripeSubscriptionId || ""
      ).trim();
    }

    if ("stripePriceId" in update) {
      update.stripePriceId = String(update.stripePriceId || "").trim();
    }

    if ("currentPeriodStart" in update) {
      update.currentPeriodStart = update.currentPeriodStart || null;
    }

    if ("currentPeriodEnd" in update) {
      update.currentPeriodEnd = update.currentPeriodEnd || null;
    }

    if ("cancelAtPeriodEnd" in update) {
      update.cancelAtPeriodEnd = Boolean(update.cancelAtPeriodEnd);
    }

    const subscription = await UserSubscription.findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("user", "name fullName email role")
      .populate(
        "membership",
        "title membershipId accessLevel billingPeriod price monthlyPrice yearlyPrice"
      );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    await syncUserMembershipPlan(
      subscription.user?._id,
      subscription.status,
      subscription.accessLevel
    );

    return res.status(200).json({
      success: true,
      message: "Subscription updated successfully.",
      data: subscription,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate Stripe subscription ID detected.",
      });
    }

    if (err?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || "Validation failed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update subscription.",
    });
  }
};

export const deleteSubscriptionAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required.",
      });
    }

    const subscription = await UserSubscription.findByIdAndDelete(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (subscription.user) {
      await User.findByIdAndUpdate(subscription.user, {
        $set: {
          membershipPlan: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription deleted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete subscription.",
    });
  }
};