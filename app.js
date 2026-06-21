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

import { blockBlockedIps } from "./middleware/blockedIpMiddleware.js";
import { optionalAuth } from "./middleware/authMiddleware.js";
import { maintenanceMiddleware } from "./middleware/maintenanceMiddleware.js";
import { csrfRequired } from "./middleware/csrfMiddleware.js";

import {
  slowApi,
  coursesReadLimiter,
  checkoutLimiter,
} from "./middleware/abuseProtection.js";

import { suspiciousRequestMiddleware } from "./middleware/suspeciousRequestMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import coachingRoutes from "./routes/coachingRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import subscriptionRoutes, {
  stripeWebhook,
} from "./routes/subscriptionRoutes.js";
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
import testMailRoutes from "./routes/testMailRoutes.js";
import emailCampaignPreviewRoutes from "./routes/emailCampaignPreviewRoutes.js";
import EmailCampaignRoutes from "./routes/emailCampaignRoutes.js";
import EmailSegmentRoutes from "./routes/emailSegmentRoutes.js";
import EmailSubscriberRoutes from "./routes/emailSubscriberRoutes.js";
import EmailTemplateRoutes from "./routes/emailTemplateRoutes.js";
import LessonProgressRoutes from "./routes/lessonProgressRoutes.js";
import SystemSettingRoutes from "./routes/systemSettingRoutes.js";
import SecurityEventRoutes from "./routes/securityEventRoutes.js";
import systemCleanupRoutes from "./routes/systemCleanupRoutes.js";
import RevenueRoutes from "./routes/revenueRoutes.js";

import { stripeWebhookHandler } from "./controllers/enrollmentController.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.set("trust proxy", 1);

const explicitOrigins = [
  "https://silver-pasca-64a87c.netlify.app",
  "https://knockoutcodes.com",
  "https://www.knockoutcodes.com",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []),
];

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (!isProd) {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);
  }

  return explicitOrigins.includes(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    if (!isProd) console.warn("Blocked by CORS:", origin);
    return callback(createError(403, "Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
    "X-Client-Fingerprint",
    "X-Request-Intent",
    "Cache-Control",
    "Pragma",
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(securityHeaders());
app.use(suspiciousRequestMiddleware);

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
    req.originalUrl === "/health" ||
    req.originalUrl === "/" ||
    req.originalUrl.startsWith("/api/v1/system") ||
    req.originalUrl.startsWith("/api/v1/system-cleanup") ||
    req.originalUrl.startsWith("/api/v1/subscriptions/webhook") ||
    req.originalUrl.startsWith("/api/v1/enrollments/webhook/stripe"),
});

app.use("/api", globalApiLimiter);

app.post(
  "/api/v1/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.post(
  "/api/v1/enrollments/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(blockBlockedIps);
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(hpp());
app.use(csrfRequired);
app.use(compression());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    name: "KnockoutCodes API",
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    time: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  const p = req.path || "";

  if (
    p.startsWith("/api/v1/auth") ||
    p.startsWith("/api/v1/admin") ||
    p.startsWith("/api/v1/dashboard") ||
    p.startsWith("/api/v1/enrollments") ||
    p.startsWith("/api/v1/checkout") ||
    p.startsWith("/api/v1/orders") ||
    p.startsWith("/api/v1/system") ||
    p.startsWith("/api/v1/system-cleanup")
  ) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
});

/**
 * Must stay before maintenanceMiddleware.
 */
app.use("/api/v1/system", SystemSettingRoutes);
app.use("/api/v1/system-cleanup", systemCleanupRoutes);

app.use(optionalAuth);
app.use(maintenanceMiddleware);

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
app.use("/api/v1/email-campaign-preview", emailCampaignPreviewRoutes);
app.use("/api/v1/admin/email-campaigns", EmailCampaignRoutes);
app.use("/api/v1/admin/email-segments", EmailSegmentRoutes);
app.use("/api/v1/admin/email-subscribers", EmailSubscriberRoutes);
app.use("/api/v1/admin/email-templates", EmailTemplateRoutes);
app.use("/api/v1/lesson-progress", LessonProgressRoutes);
app.use("/api/v1/security-events", SecurityEventRoutes);
app.use("/api/v1/admin/revenue", RevenueRoutes);

app.use((_req, _res, next) => {
  next(createError(404, "Route not found"));
});

app.use((err, req, res, _next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Server error";

  if (!isProd) {
    return res.status(status).json({
      success: false,
      status,
      message,
      stack: err.stack,
    });
  }

  return res.status(status).json({
    success: false,
    status,
    message,
  });
});

export default app;
