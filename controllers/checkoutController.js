// controllers/checkoutController.js
import Stripe from "stripe";
import mongoose from "mongoose";
import Product from "../models/ProductModel.js";
import Course from "../models/CourseModel.js";

/**
 * ✅ Local asyncHandler (prevents circular imports)
 */
const asyncHandler =
  (fn) =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

/**
 * ✅ Stripe init (guarded)
 */
// eslint-disable-next-line no-undef
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY) {
  // This prevents silent failures that turn into confusing 500s
  console.error("❌ STRIPE_SECRET_KEY is missing in your .env");
}

const stripe = new Stripe(STRIPE_KEY || ""); // still created, but we guard before use

/**
 * ✅ Make absolute URL for Stripe images
 * Stripe requires full URLs (http/https).
 *
 * Your stored image might be:
 *  - "uploads/avatar/xyz.png"
 *  - "/uploads/avatar/xyz.png"
 *
 * We convert it to:
 *  - "http://localhost:5000/uploads/avatar/xyz.png" (dev)
 */
function toAbsoluteUrl(req, maybeUrl) {
  const val = String(maybeUrl || "").trim();
  if (!val) return null;

  // already absolute
  if (/^https?:\/\//i.test(val)) return val;

  // normalize "uploads/..." -> "/uploads/..."
  const normalized = val.startsWith("/") ? val : `/${val}`;

  // Prefer env BACKEND_URL if provided
  // eslint-disable-next-line no-undef
  const BACKEND_URL = process.env.BACKEND_URL?.trim();

  if (BACKEND_URL && /^https?:\/\//i.test(BACKEND_URL)) {
    return `${BACKEND_URL.replace(/\/$/, "")}${normalized}`;
  }

  // fallback: build from request host
  const origin = `${req.protocol}://${req.get("host")}`;
  return `${origin}${normalized}`;
}

/* ============================================================
   ✅ CreateProductCheckoutSession
============================================================ */
export const createProductCheckoutSession = asyncHandler(async (req, res) => {
  // eslint-disable-next-line no-undef
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!STRIPE_KEY) {
    return res.status(500).json({
      message: "Stripe is not configured. Missing STRIPE_SECRET_KEY in .env",
    });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!items.length) {
    return res.status(400).json({ message: "No items provided for checkout." });
  }

  // sanitize qty + collect ids
  const normalized = items.map((it) => ({
    productId: String(it.productId || ""),
    qty: Math.max(1, Math.min(99, parseInt(it.qty || 1, 10) || 1)),
  }));

  const ids = normalized.map((x) => x.productId);

  // Load products from DB (prevents client price tampering)
  const products = await Product.find({ _id: { $in: ids }, isActive: true })
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
    if (!Number.isFinite(unitAmount) || unitAmount < 0) {
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/cart`,
    metadata: {
      type: "products",
      itemCount: String(items.length),
    },
  });

  return res.json({ url: session.url, id: session.id });
});

/* ============================================================
   ✅ CreateCourseCheckoutSession
   POST /api/v1/checkout/courses
   body: { courseId, billingPlan: "one_time" | "monthly" | "yearly" }
============================================================ */
// POST /api/v1/checkout/courses
// body: { courseId, billingPlan: "one_time" | "monthly" | "yearly" }

// ✅ CreateCourseCheckoutSession
// POST /api/v1/checkout/courses
// body: { courseId, billingPlan: "one_time" | "monthly" | "yearly" }

export const createCourseCheckoutSession = asyncHandler(async (req, res) => {
  // eslint-disable-next-line no-undef
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!STRIPE_KEY) {
    return res.status(500).json({
      message: "Stripe is not configured. Missing STRIPE_SECRET_KEY in .env",
    });
  }

  const courseId = String(req.body?.courseId || "").trim();
  const billingPlan = String(req.body?.billingPlan || "one_time").trim();

  if (!courseId) {
    return res.status(400).json({ message: "courseId is required." });
  }

  let course = null;

  if (mongoose.Types.ObjectId.isValid(courseId)) {
    course = await Course.findById(courseId)
      .select("title price salePrice isFree isPublished thumbnail slug stripePriceId")
      .lean();
  }

  if (!course) {
    course = await Course.findOne({ slug: courseId })
      .select("title price salePrice isFree isPublished thumbnail slug stripePriceId")
      .lean();
  }

  if (!course) {
    return res.status(404).json({ message: `Course not found: ${courseId}` });
  }

  if (course.isPublished === false) {
    return res.status(403).json({ message: "This course is not published yet." });
  }

  if (billingPlan !== "one_time") {
    return res.status(400).json({
      message:
        "Monthly/yearly not configured yet. Use one_time for now (we’ll add recurring Stripe Prices next).",
    });
  }

  const kind = "membership"; // ✅ your success/failed pages treat non-cart as "membership"

  // ✅ IMPORTANT CHANGE:
  // success_url goes to your success page
  // cancel_url goes to your failed page (with canceled=true)
  const successUrl =
    `${FRONTEND_URL}/subscription/success` +
    `?session_id={CHECKOUT_SESSION_ID}` +
    `&kind=${encodeURIComponent(kind)}` +
    `&courseId=${encodeURIComponent(String(course._id))}`;

  const cancelUrl =
    `${FRONTEND_URL}/subscription/failed` +
    `?canceled=true` +
    `&kind=${encodeURIComponent(kind)}`;

  // ✅ Stripe price-id path (best)
  const stripePriceId = String(course.stripePriceId || "").trim();

  if (stripePriceId) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: stripePriceId, quantity: 1 }],

      // ✅ changed here
      success_url: successUrl,
      cancel_url: cancelUrl,

      metadata: {
        type: "course",
        courseId: String(course._id),
        billingPlan: "one_time",
        userId: req.user?._id ? String(req.user._id) : "",
      },
    });

    return res.json({ url: session.url, id: session.id });
  }

  // ✅ fallback: dynamic price_data
  const rawPrice =
    course.salePrice != null && Number(course.salePrice) > 0
      ? Number(course.salePrice)
      : Number(course.price || 0);

  const unitAmount = Math.round(rawPrice * 100);

  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    return res.status(400).json({ message: "Invalid course price." });
  }

  const courseImageAbs = toAbsoluteUrl(req, course.thumbnail);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
            metadata: {
              type: "course",
              courseId: String(course._id),
              slug: course.slug || "",
            },
          },
        },
      },
    ],

    // ✅ changed here
    success_url: successUrl,
    cancel_url: cancelUrl,

    metadata: {
      type: "course",
      courseId: String(course._id),
      billingPlan: "one_time",
      userId: req.user?._id ? String(req.user._id) : "",
    },
  });

  return res.json({ url: session.url, id: session.id });
});
