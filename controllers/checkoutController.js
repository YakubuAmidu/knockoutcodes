// controllers/checkoutController.js
import Stripe from "stripe";
import mongoose from "mongoose";
import Product from "../models/ProductModel.js";
import Course from "../models/CourseModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

// eslint-disable-next-line no-undef
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(STRIPE_KEY || "");

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "advanced") return "advance";
  return level;
}

function toAbsoluteUrl(req, maybeUrl) {
  const val = String(maybeUrl || "").trim();
  if (!val) return null;

  if (/^https?:\/\//i.test(val)) return val;

  const normalized = val.startsWith("/") ? val : `/${val}`;
  // eslint-disable-next-line no-undef
  const BACKEND_URL = process.env.BACKEND_URL?.trim();

  if (BACKEND_URL && /^https?:\/\//i.test(BACKEND_URL)) {
    return `${BACKEND_URL.replace(/\/$/, "")}${normalized}`;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  return `${origin}${normalized}`;
}

export const createProductCheckoutSession = asyncHandler(async (req, res) => {
  // eslint-disable-next-line no-undef
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "You must be logged in to checkout.",
    });
  }

  if (!STRIPE_KEY) {
    return res.status(500).json({
      success: false,
      message: "Payment service is not configured.",
    });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({
      success: false,
      message: "No items provided for checkout.",
    });
  }

  const normalized = items.map((it) => ({
    productId: String(it.productId || ""),
    qty: Math.max(1, Math.min(99, parseInt(it.qty || 1, 10) || 1)),
  }));

  const ids = normalized
    .map((x) => x.productId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!ids.length) {
    return res.status(400).json({
      success: false,
      message: "No valid products provided for checkout.",
    });
  }

  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
  })
    .select("title price images brand stock")
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));

  const line_items = normalized.map((it) => {
    const p = byId.get(it.productId);

    if (!p) {
      const err = new Error("One or more products are invalid/inactive.");
      err.statusCode = 400;
      throw err;
    }

    if (typeof p.stock === "number" && p.stock <= 0) {
      const err = new Error(`${p.title} is out of stock.`);
      err.statusCode = 400;
      throw err;
    }

    const unitAmount = Math.round(Number(p.price || 0) * 100);

    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      const err = new Error(`Invalid price for ${p.title}`);
      err.statusCode = 400;
      throw err;
    }

    const imageRaw =
      Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : "";

    const imageAbs = toAbsoluteUrl(req, imageRaw);

    return {
      quantity: it.qty,
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name: p.title,
          images: imageAbs ? [imageAbs] : undefined,
          metadata: {
            productId: String(p._id),
            brand: p.brand || "",
          },
        },
      },
    };
  });

  const orderItemsForMetadata = normalized.map((it) => ({
    productId: it.productId,
    qty: it.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(userId),
    line_items,

    // ✅ Collect customer shipping address for physical products
    shipping_address_collection: {
      allowed_countries: [
        "US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "BE",
        "CH", "SE", "NO", "DK", "FI", "IE", "PT", "AT", "PL", "CZ",
        "JP", "KR", "SG", "NZ", "MX", "BR", "ZA", "AE", "GH", "NG",
      ],
    },

    // ✅ Collect phone number for delivery contact
    phone_number_collection: {
      enabled: true,
    },

    // ✅ Helps Stripe show shipping-related customer info
    billing_address_collection: "auto",

  success_url:
  `${FRONTEND_URL}/order/success` +
  `?session_id={CHECKOUT_SESSION_ID}` +
  `&kind=products`,

cancel_url:
  `${FRONTEND_URL}/order/failed` +
  `?canceled=true` +
  `&kind=products`,

    metadata: {
      type: "products",
      kind: "products",
      userId: String(userId),
      itemCount: String(items.length),
      requiresShipping: "true",
      items: JSON.stringify(orderItemsForMetadata),
    },
  });

  return res.json({
    success: true,
    url: session.url,
    id: session.id,
  });
});

export const createCourseCheckoutSession = asyncHandler(async (req, res) => {
  // eslint-disable-next-line no-undef
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!STRIPE_KEY) {
    return res.status(500).json({
      success: false,
      message: "Payment service is not configured.",
    });
  }

  const userId = req.user?._id || req.user?.id;
  const courseId = String(req.body?.courseId || "").trim();
  const billingPlan = String(req.body?.billingPlan || "one_time").trim();

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "You must be logged in to purchase this course.",
    });
  }

  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: "courseId is required.",
    });
  }

  let course = null;

  const courseSelect =
    "title price salePrice isFree isPublished thumbnail slug stripePriceId level requiredMembershipLevel";

  if (mongoose.Types.ObjectId.isValid(courseId)) {
    course = await Course.findById(courseId).select(courseSelect).lean();
  }

  if (!course) {
    course = await Course.findOne({ slug: courseId }).select(courseSelect).lean();
  }

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found: ${courseId}`,
    });
  }

  if (course.isPublished === false) {
    return res.status(403).json({
      success: false,
      message: "This course is not published yet.",
    });
  }

  if (course.isFree) {
    return res.status(409).json({
      success: false,
      alreadyAccessible: true,
      message: "This course is free. You do not need to purchase it.",
      courseId: String(course._id),
    });
  }

  const existingEnrollment = await Enrollment.findOne({
    user: userId,
    course: course._id,
    paymentStatus: "paid",
    status: { $in: ["active", "completed"] },
  }).lean();

  if (existingEnrollment) {
    return res.status(409).json({
      success: false,
      alreadyPurchased: true,
      message: "You already purchased this course. Open it from My Courses.",
      courseId: String(course._id),
      enrollmentId: String(existingEnrollment._id),
    });
  }

  const existingSubscription = await UserSubscription.findOne({
    user: userId,
    status: { $in: ["active", "trialing"] },
  }).lean();

  if (existingSubscription) {
    const userLevel = normalizeLevel(
      existingSubscription.accessLevel || existingSubscription.membershipId
    );

    const requiredLevel = normalizeLevel(
      course.requiredMembershipLevel || course.level || "beginner"
    );

    if (userLevel && requiredLevel && userLevel === requiredLevel) {
      return res.status(409).json({
        success: false,
        alreadyAccessible: true,
        message: "This course is already included in your active membership.",
        courseId: String(course._id),
      });
    }
  }

  if (billingPlan !== "one_time") {
    return res.status(400).json({
      success: false,
      message:
        "Monthly/yearly course checkout is not configured here. Use one_time for single course purchase.",
    });
  }

  const successUrl =
    `${FRONTEND_URL}/subscription/success` +
    `?session_id={CHECKOUT_SESSION_ID}` +
    `&kind=course` +
    `&courseId=${encodeURIComponent(String(course._id))}`;

  const cancelUrl =
    `${FRONTEND_URL}/subscription/failed` +
    `?canceled=true` +
    `&kind=course`;

  const metadata = {
    type: "course",
    kind: "course",
    courseId: String(course._id),
    billingPlan: "one_time",
    paymentPlan: "one-time",
    userId: String(userId),
  };

  const stripePriceId = String(course.stripePriceId || "").trim();

  if (stripePriceId) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(userId),
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    return res.json({
      success: true,
      url: session.url,
      id: session.id,
    });
  }

  const rawPrice =
    course.salePrice != null && Number(course.salePrice) > 0
      ? Number(course.salePrice)
      : Number(course.price || 0);

  const unitAmount = Math.round(rawPrice * 100);

  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid course price.",
    });
  }

  const courseImageAbs = toAbsoluteUrl(req, course.thumbnail);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(userId),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: course.title,
            images:
              courseImageAbs && /^https?:\/\//i.test(courseImageAbs)
                ? [courseImageAbs]
                : undefined,
            metadata,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return res.json({
    success: true,
    url: session.url,
    id: session.id,
  });
});