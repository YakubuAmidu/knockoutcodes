// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* =========================
   Constants
========================= */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_HISTORY_LIMIT = 5;

// eslint-disable-next-line no-undef
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================
   User Schema
========================= */
const userSchema = new mongoose.Schema(
  {
    // Basic profile
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [80, "Name cannot exceed 80 characters."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [120, "Email cannot exceed 120 characters."],
      validate: {
        validator: (value) => emailRegex.test(String(value || "")),
        message: "Please provide a valid email address.",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [
        PASSWORD_MIN_LENGTH,
        "Password must be at least 8 characters.",
      ],
      select: false,
    },

    // Authorization
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "on_hold", "suspended", "banned", "deactivated"],
      default: "active",
      index: true,
    },

    statusReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    statusChangedAt: {
      type: Date,
      default: null,
    },

    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerificationToken: {
      type: String,
      select: false,
      default: "",
      index: true,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
      default: null,
    },

    // Login security
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
      index: true,
    },

    lastFailedLoginAt: {
      type: Date,
      select: false,
      default: null,
    },

    lockUntil: {
      type: Date,
      select: false,
      default: null,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },

    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastLoginIp: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    lastLoginUserAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Token/session versioning
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      select: false,
      default: "",
    },

    refreshTokenId: {
      type: String,
      select: false,
      default: "",
      index: true,
    },

    refreshTokenExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },

    // Password reset/change tracking
    passwordChangedAt: {
      type: Date,
      select: false,
      default: null,
    },

    lastPasswordResetAt: {
      type: Date,
      select: false,
      default: null,
    },

    passwordResetToken: {
      type: String,
      select: false,
      default: "",
      index: true,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },

    passwordHistory: [
      {
        hash: {
          type: String,
          required: true,
          select: false,
        },
        changedAt: {
          type: Date,
          default: Date.now,
          select: false,
        },
      },
    ],

    // Public profile fields
    avatar: {
      type: String,
      default: "",
    },
    avatarContentType: {
      type: String,
      default: "",
    },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    website: { type: String, trim: true, maxlength: 300, default: "" },
    instagram: { type: String, trim: true, maxlength: 120, default: "" },
    tiktok: { type: String, trim: true, maxlength: 120, default: "" },
    youtube: { type: String, trim: true, maxlength: 300, default: "" },
    xhandle: { type: String, trim: true, maxlength: 120, default: "" },
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    headline: { type: String, trim: true, maxlength: 200, default: "" },

    // Preferences
    notifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    minimize: true,
  },
);

/* =========================
   Indexes
   Note: email already has unique: true above.
========================= */
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ accountStatus: 1, isActive: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });

/* =========================
   Middleware
========================= */
userSchema.pre("save", async function hashPassword(next) {
  try {
    if (!this.isModified("password")) return next();

    const plainPassword = String(this.password || "");

    if (plainPassword.length < PASSWORD_MIN_LENGTH) {
      return next(new Error("Password must be at least 8 characters."));
    }

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const newHashedPassword = await bcrypt.hash(plainPassword, salt);

    this.password = newHashedPassword;
    this.passwordChangedAt = new Date();

    if (Array.isArray(this.passwordHistory)) {
      this.passwordHistory = this.passwordHistory.slice(
        0,
        PASSWORD_HISTORY_LIMIT,
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

/* =========================
   Instance Methods
========================= */
userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword,
) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(String(candidatePassword), this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

userSchema.methods.clearRefreshToken = function clearRefreshToken() {
  this.refreshTokenHash = "";
  this.refreshTokenId = "";
  this.refreshTokenExpiresAt = null;
};

userSchema.methods.bumpTokenVersion = function bumpTokenVersion() {
  this.tokenVersion = Number(this.tokenVersion || 0) + 1;
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });

  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.refreshTokenId;
  delete obj.refreshTokenExpiresAt;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.passwordChangedAt;
  delete obj.passwordHistory;
  delete obj.tokenVersion;
  delete obj.__v;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.lastPasswordResetAt;
  delete obj.lastFailedLoginAt;
  delete obj.adminNotes;
  delete obj.statusReason;
  delete obj.statusChangedBy;
  delete obj.deletedBy;

  return obj;
};

/* =========================
   Model Export
========================= */
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
