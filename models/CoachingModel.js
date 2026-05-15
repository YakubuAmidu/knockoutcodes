// models/CoachingModel.js
import mongoose from "mongoose";

/**
 * Allowed coaching session types shown on the coaching form.
 */
export const BOXING_COACHING_TYPES = [
  "Power Punch Mechanics",
  "Speed + Combination Flow",
  "Defense, Slips + Counters",
  "Footwork, Angles + Ring IQ",
  "Body Shots + Inside Fighting",
  "Southpaw vs Orthodox Strategy",
  "Bagwork Drill Plan (No Gym)",
  "Conditioning + Fight Pace",
];

/**
 * Captures where the coaching request came from.
 * Useful for security, analytics, and admin review.
 */
const sourceSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      trim: true,
      default: "web",
    },

    pageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      default: null,
    },

    ip: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const coachingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },

    coachingType: {
      type: String,
      required: true,
      enum: BOXING_COACHING_TYPES,
    },

    duration: {
      type: Number,
      required: true,
      enum: [30, 60, 90],
    },

    timeZone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    preferredDate: {
      type: String,
      required: true,
      trim: true,
    },

    preferredTime: {
      type: String,
      required: true,
      trim: true,
    },

    preferredStartISO: {
      type: String,
      trim: true,
      default: null,
    },

    preferGoogleMeet: {
      type: Boolean,
      default: true,
    },

    goals: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },

    marketingOptIn: {
      type: Boolean,
      default: false,
    },

    emailSubject: {
      type: String,
      trim: true,
      default: null,
    },

    emailSummary: {
      type: String,
      trim: true,
      default: null,
    },

    source: {
      type: sourceSchema,
      default: () => ({}),
    },

    // Admin-only fields.
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

coachingSchema.index({ createdAt: -1 });
coachingSchema.index({ email: 1, createdAt: -1 });
coachingSchema.index({ status: 1, createdAt: -1 });

const Coaching =
  mongoose.models.Coaching ||
  mongoose.model("Coaching", coachingSchema, "coachings");

export default Coaching;