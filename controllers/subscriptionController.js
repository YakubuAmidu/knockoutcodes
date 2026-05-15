// controllers/subscriptionController.js
import mongoose from "mongoose";
import { stripe } from "../config/stripe.js";
import Membership from "../models/MembershipModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import User from "../models/UserModel.js";
import Course from "../models/CourseModel.js";
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

const isActiveStatus = (status) => status === "active" || status === "trialing";

function normalizeBillingPeriod(value) {
  return String(value || "").toLowerCase() === "yearly" ? "yearly" : "monthly";
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

function getStripePriceId(plan, billingPeriod) {
  if (billingPeriod === "yearly") {
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

export const createCheckoutSession = async (req, res) => {
  try {
    const { membershipId, courseId, billingPeriod: rawBillingPeriod } = req.body;

    const billingPeriod = normalizeBillingPeriod(rawBillingPeriod);
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: "membershipId is required",
      });
    }

    const plan = await findMembershipPlan(membershipId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const safeMembershipId = normalizeMembershipId(
      plan.accessLevel || plan.membershipId || plan.slug || membershipId
    );

    if (!safeMembershipId) {
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
        message: "User not found",
      });
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || "",
      metadata: {
        userId: String(userId),
      },
    });

    await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: plan._id,
          membershipId: safeMembershipId,
          accessLevel: safeMembershipId,
          stripeCustomerId: customer.id,
          stripePriceId: priceId,
          billingPeriod,
          status: "incomplete",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    const safeCourseId = courseId ? String(courseId).trim() : "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
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
    console.error("createCheckoutSession error:", err);

    return res.status(500).json({
      success: false,
      message: err?.message || "Could not create checkout session",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    // eslint-disable-next-line no-undef
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (
        session.mode === "payment" &&
        (session.metadata?.type === "products" ||
          session.metadata?.kind === "products")
      ) {
        try {
          console.log("✅ Product payment completed:", session.id);

          const userId = session.metadata?.userId || session.client_reference_id;

          if (!userId) {
            console.error("❌ Missing userId in product checkout session.");
            return res.json({ received: true });
          }

          const existingOrder = await Order.findOne({
            stripeSessionId: session.id,
          }).lean();

          if (existingOrder) {
            console.log("⚠️ Product order already exists.");
            return res.json({ received: true });
          }

          const customerDetails = session.customer_details || {};
          const address = customerDetails.address || {};

          let parsedItems = [];

          try {
            parsedItems = JSON.parse(session.metadata?.items || "[]");
          } catch (err) {
            console.error("❌ Failed to parse Stripe metadata items:", err);
            return res.json({ received: true });
          }

          if (!Array.isArray(parsedItems) || !parsedItems.length) {
            console.error("❌ No valid product items found in metadata.");
            return res.json({ received: true });
          }

          const productIds = parsedItems
            .map((item) => item.productId)
            .filter(Boolean);

          const products = await mongoose.model("Product").find({
            _id: { $in: productIds },
            isDeleted: false,
            isActive: true,
          });

          if (!products.length) {
            console.error("❌ No active products found.");
            return res.json({ received: true });
          }

          const orderItems = [];
          let subtotal = 0;
          const currency = (session.currency || "usd").toUpperCase();

          for (const cartItem of parsedItems) {
            const product = products.find(
              (p) => String(p._id) === String(cartItem.productId)
            );

            if (!product) continue;

            const qty = Math.max(1, parseInt(cartItem.qty || 1, 10));

            if (product.stock < qty) {
              console.error(`❌ Not enough stock for ${product.title}`);
              continue;
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

            product.stock -= qty;

            if (product.stock < 0) {
              product.stock = 0;
            }

            await product.save();
          }

          if (!orderItems.length) {
            console.error("❌ No valid order items created.");
            return res.json({ received: true });
          }

          const total = subtotal;

          const createdOrder = await Order.create({
            user: userId,
            stripeSessionId: session.id,
            items: orderItems,
            subtotal,
            discount: 0,
            total,
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

          console.log("✅ Product order created:", createdOrder._id);
        } catch (productWebhookErr) {
          console.error("❌ Product webhook error:", productWebhookErr);
        }
      }

      if (session.mode === "subscription" && session.subscription) {
        const userId = session.metadata?.userId || session.client_reference_id;
        const membershipId = normalizeMembershipId(session.metadata?.membershipId);
        const courseId = session.metadata?.courseId || "";

        const plan = membershipId
          ? await Membership.findOne({
              isPublished: true,
              $or: [
                { membershipId },
                { accessLevel: membershipId },
                { slug: membershipId },
              ],
            }).lean()
          : null;

        if (!userId || !plan) {
          console.error("Missing user or membership plan in webhook:", {
            userId,
            membershipId,
          });

          return res.json({ received: true });
        }

        const safeMembershipId = normalizeMembershipId(
          plan.accessLevel || plan.membershipId || plan.slug || membershipId
        );

        if (!safeMembershipId) {
          console.error("Invalid membership level in webhook:", {
            planMembershipId: plan.membershipId,
            planAccessLevel: plan.accessLevel,
            planSlug: plan.slug,
          });

          return res.json({ received: true });
        }

        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

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
              billingPeriod: normalizeBillingPeriod(session.metadata?.billingPeriod),
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
          {
            upsert: true,
            new: true,
            runValidators: true,
          }
        );

        await User.findByIdAndUpdate(userId, {
          $set: {
            membershipPlan: safeMembershipId,
          },
        });

        const courseDoc = await findCourseByIdOrSlug(courseId);

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
              unitPrice: 0,
              currency,
            });
          }

          const total = items.reduce(
            (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
            0
          );

          await Order.create({
            user: userId,
            items,
            subtotal: total,
            discount: 0,
            total,
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
        {
          new: true,
          runValidators: true,
        }
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;

      await UserSubscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        {
          $set: {
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("stripeWebhook handler error:", err);

    return res.status(500).json({
      success: false,
      message: "Webhook handler failed",
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

    const sub = await UserSubscription.findOne({ user: userId })
      .populate(
        "membership",
        "membershipId accessLevel title stripePriceId stripePriceIdMonthly stripePriceIdYearly"
      )
      .lean();

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

    return res.status(200).json({
      success: true,
      data: {
        hasSubscription: true,
        isActive: isActiveStatus(sub.status),
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
  } catch (err) {
    console.error("getMySubscription error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
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
        message: "Auth required",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "session_id is required",
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
        message: "Session does not belong to this user",
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

    if (!safeMembershipId) {
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
          status: normalizeStatus(stripeSub?.status || "active"),
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
      }
    ).lean();

    await User.findByIdAndUpdate(userId, {
      $set: {
        membershipPlan: safeMembershipId,
      },
    });

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
    console.error("confirmCheckoutSession error:", err);

    return res.status(500).json({
      success: false,
      message: err?.message || "Could not confirm session",
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

    if (!newMembershipId) {
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

    const updatedSub = await UserSubscription.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          membership: newPlan._id,
          membershipId: newMembershipId,
          accessLevel: newMembershipId,
          billingPeriod,
          stripePriceId: newPriceId,
          status: normalizeStatus(updatedStripeSub.status),
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

    await User.findByIdAndUpdate(userId, {
      $set: {
        membershipPlan: newMembershipId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Membership switched successfully.",
      data: updatedSub,
    });
  } catch (err) {
    console.error("switchMembershipPlan error:", err);

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

    const stripeSub = await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

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
    console.error("cancelMySubscription error:", err);

    return res.status(500).json({
      success: false,
      message: err?.message || "Could not cancel subscription.",
    });
  }
};