// models/CoachingModel.js
import mongoose from "mongoose";

const SourceSchema = new mongoose.Schema(
  {
    channel: { type: String, default: "web" },
    pageUrl: { type: String, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { _id: false },
);

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

const CoachingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    fullName: { type: String, required: true, trim: true, maxlength: 80 },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: { type: String, required: true, trim: true, maxlength: 25 },

    coachingType: {
      type: String,
      required: true,
      enum: BOXING_COACHING_TYPES,
    },

    duration: { type: Number, required: true, enum: [30, 60, 90] },
    timeZone: { type: String, required: true, trim: true, maxlength: 60 },

    preferredDate: { type: String, required: true }, // YYYY-MM-DD
    preferredTime: { type: String, required: true }, // HH:mm
    preferredStartISO: { type: String, default: null },

    preferGoogleMeet: { type: Boolean, required: true, default: true },

    goals: { type: String, required: true, trim: true, maxlength: 1200 },

    marketingOptIn: { type: Boolean, required: true, default: false },

    emailSubject: { type: String, default: null },
    emailSummary: { type: String, default: null },

    source: { type: SourceSchema, default: () => ({}) },

    // Admin-only fields
    adminNote: { type: String, trim: true, default: "", maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

CoachingSchema.index({ createdAt: -1 });
CoachingSchema.index({ email: 1, createdAt: -1 });

const Coaching = mongoose.model("Coaching", CoachingSchema, "coachings");

export default Coaching;
