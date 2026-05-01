import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Please provide a valid email address.",
      },
    },
    topic: {
      type: String,
      trim: true,
      default: "",
      maxlength: 60,
    },
    source: {
      type: String,
      trim: true,
      default: "footer",
      maxlength: 40,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Newsletter = mongoose.model("Newsletter", newsletterSchema);
export default Newsletter;
