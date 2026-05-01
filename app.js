// app.js
import express from "express";
import cors from "cors";
import securityHeaders from "./config/helmet.js";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import createError from "http-errors";
import process from "node:process";
import path from "path";
import { fileURLToPath } from "url";
import mongoSanitize from "express-mongo-sanitize";

// ✅ Middlewares
import { csrfRequired } from "./middleware/csrfMiddleware.js";
import {
  slowApi,
  coursesReadLimiter,
  checkoutLimiter
} from "./middleware/abuseProtection.js";

// ✅ routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import coachingRoutes from "./routes/coachingRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import subscriptionRoutes, { stripeWebhook } from "./routes/subscriptionRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminStatsRoutes from "./routes/adminStatsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import userDashboardRoutes from "./routes/userDashboardRoutes.js";
import testMailRoutes from './routes/testMailRoutes.js';
import emailCampaignPreviewRoutes from './routes/emailCampaignPreviewRoutes.js';
import EmailCampaignRoutes from "./routes/emailCampaignRoutes.js";
import EmailSegmentRoutes from './routes/emailSegmentRoutes.js';
import EmailSubscriberRoutes from "./routes/emailSubscriberRoutes.js";
import EmailTemplateRoutes from './routes/emailTemplateRoutes.js';

// ✅ NEW: Enrollment Stripe webhook handler (RAW BODY route must live in app.js)
import { stripeWebhookHandler } from "./controllers/enrollmentController.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/**
 * ✅ SECURITY HEADERS (Reusable Helmet)
 */
app.use(securityHeaders());

/**
 * ✅ CORS (allow any localhost port in dev)
 */
const isProd = process.env.NODE_ENV === "production";

const explicitOrigins = [
  "https://knockoutcodes.com",
  "https://www.knockoutcodes.com",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : []),
];

function isAllowedOrigin(origin) {
  if (!origin) return true;

  // ✅ dev: allow any localhost/127.0.0.1 port
  if (!isProd) {
    const devOk = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);
    if (devOk) return true;
  }

  // prod + explicit allow list
  return explicitOrigins.includes(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      if (!isProd) console.warn("Blocked by CORS:", origin);
      return callback(createError(403, "Not allowed by CORS"));
    },
    credentials: true,
  })
);

/**
 * ✅ API RATE LIMIT (broad, your auth/login have their own limiters too)
 */
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 400 : 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
  skip: (req) =>
    req.path === "/health" ||
    req.path === "/" ||
    req.path.startsWith("/api/v1/subscriptions/webhook") ||
    req.path.startsWith("/api/v1/enrollments/webhook/stripe"),
});

app.use("/api", globalApiLimiter);

/**
 * ✅ STRIPE WEBHOOK RAW BODY (must be before json)
 * - Subscription webhook (existing)
 */
app.post(
  "/api/v1/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

/**
 * ✅ STRIPE WEBHOOK RAW BODY (must be before json)
 * - Enrollment webhook (NEW)
 * - NO AUTH, NO CSRF
 * - Verified by Stripe signature inside stripeWebhookHandler
 */
app.post(
  "/api/v1/enrollments/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

/**
 * BODY PARSERS
 */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/**
 * ✅ COOKIES MUST COME BEFORE CSRF
 */
app.use(cookieParser());

/**
 * ✅ sanitize + hpp
 * - mongoSanitize: blocks $ and . injection
 * - hpp: blocks HTTP param pollution (?a=1&a=2)
 */
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);

app.use(hpp());

/**
 * ✅ CSRF (must come after cookieParser)
 */
app.use(csrfRequired);

/**
 * compression + logs
 */
app.use(compression());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

/**
 * STATIC: uploads
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * ROOT / HEALTH
 */
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    name: "KnockoutCodes API",
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", time: new Date().toISOString() });
});

/**
 * ✅ Prevent caching sensitive responses (auth/admin)
 * Put BEFORE routes so it applies to them.
 */
app.use((req, res, next) => {
  const p = req.path || "";
  if (p.startsWith("/api/v1/auth") || p.startsWith("/api/v1/admin")) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

/**
 * ROUTES
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/testimonials", testimonialRoutes);
app.use("/api/v1/coachings", coachingRoutes);
app.use("/api/v1/newsletters", newsletterRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminStatsRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin/revenue", revenueRoutes);
app.use("/api/v1/courses", slowApi, coursesReadLimiter, courseRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/checkout", slowApi, checkoutLimiter, checkoutRoutes);
app.use("/api/v1/auth/sessions", sessionRoutes);
app.use("/api/v1/dashboard", userDashboardRoutes);
app.use("/api/v1/test-mail", testMailRoutes);
app.use("/api/v1/email-campaigns/preview", emailCampaignPreviewRoutes);
app.use("/api/v1/admin/email-campaigns", EmailCampaignRoutes);
app.use("/api/v1/admin/email-segments", EmailSegmentRoutes);
app.use("/api/v1/admin/email-subscribers", EmailSubscriberRoutes);
app.use("/api/v1/admin/email-templates", EmailTemplateRoutes);

/**
 * 404
 */
app.use((_req, _res, next) => {
  next(createError(404, "Route not found"));
});

/**
 * ERROR HANDLER
 */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Server error";

  if (!isProd) {
    return res.status(status).json({
      status,
      message,
      stack: err.stack,
    });
  }

  return res.status(status).json({ status, message });
});

export default app;
