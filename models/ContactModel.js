// models/contactModel.js
import mongoose from "mongoose";

/* =========================================================
   CONTACT MESSAGE SCHEMA
   Stores every user/admin reply inside one contact thread.
========================================================= */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: [true, "Message sender is required."],
    },

    text: {
      type: String,
      required: [true, "Message text is required."],
      trim: true,
      minlength: [1, "Message cannot be empty."],
      maxlength: [5000, "Message cannot exceed 5000 characters."],
    },
  },
  { timestamps: true }
);

/* =========================================================
   CONTACT SCHEMA
   Premium support inbox model for public contact requests,
   user/admin conversation threads, and admin follow-up.
========================================================= */
const contactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Contact message must belong to a user."],
    },

    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [60, "Name cannot exceed 60 characters."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [70, "Email cannot exceed 70 characters."],
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      minlength: [10, "Phone number must be at least 10 digits."],
      maxlength: [20, "Phone number cannot exceed 20 characters."],
    },

    subject: {
      type: String,
      required: [true, "Subject is required."],
      trim: true,
      minlength: [2, "Subject must be at least 2 characters."],
      maxlength: [300, "Subject cannot exceed 300 characters."],
    },

    message: {
      type: String,
      trim: true,
      maxlength: [2500, "Message cannot exceed 2500 characters."],
      default: "",
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    lastSender: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    userLastSeenAt: {
      type: Date,
      default: null,
    },

    adminLastSeenAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["new", "open", "pending", "resolved", "closed"],
      default: "new",
    },

    isSeen: {
      type: Boolean,
      default: false,
    },

    replied: {
      type: Boolean,
      default: false,
    },

    replyNote: {
      type: String,
      trim: true,
      maxlength: [2000, "Reply note cannot exceed 2000 characters."],
      default: "",
    },
  },
  { timestamps: true }
);

/* =========================================================
   NORMALIZATION + THREAD SAFETY
========================================================= */
contactSchema.pre("validate", function (next) {
  if (this.name) this.name = String(this.name).trim();
  if (this.email) this.email = String(this.email).trim().toLowerCase();
  if (this.phone) this.phone = String(this.phone).replace(/[^\d+]/g, "").trim();
  if (this.subject) this.subject = String(this.subject).trim();
  if (this.message) this.message = String(this.message).trim();
  if (this.replyNote) this.replyNote = String(this.replyNote).trim();

  next();
});

contactSchema.pre("save", function (next) {
  if (Array.isArray(this.messages) && this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];

    if (lastMessage?.sender) {
      this.lastSender = lastMessage.sender;
    }

    this.lastMessageAt = lastMessage?.createdAt || new Date();
  }

  if (this.lastSender === "admin") {
    this.replied = true;
  }

  next();
});

/* =========================================================
   QUERY PERFORMANCE INDEXES
   Keep indexes here only to avoid duplicate index warnings.
========================================================= */
contactSchema.index({ email: 1 });
contactSchema.index({ user: 1, updatedAt: -1 });
contactSchema.index({ status: 1, isSeen: 1, updatedAt: -1 });
contactSchema.index({ lastSender: 1, lastMessageAt: -1 });
contactSchema.index({ createdAt: -1 });

/* =========================================================
   PREVENT MODEL OVERWRITE IN DEV/HOT RELOAD
========================================================= */
const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export default Contact;