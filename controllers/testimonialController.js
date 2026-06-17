import mongoose from "mongoose";
import Testimonial from "../models/Testimonial.js";
import User from "../models/UserModel.js";

const userPublicFields =
  "name fullName username firstName lastName email image avatar profileImage displayName";

function clampRating(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.min(5, Math.max(1, Math.round(x)));
}

function cleanText(v) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function countLinks(text = "") {
  const links = String(text).match(/https?:\/\/|www\./gi);
  return links ? links.length : 0;
}

function hasRepeatSpam(text = "") {
  return /([a-zA-Z0-9!?.])\1{9,}/.test(String(text));
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getBestUserName(user = {}, fallbackName = "") {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    cleanText(fallbackName) ||
    cleanText(user.name) ||
    cleanText(user.fullName) ||
    cleanText(user.username) ||
    cleanText(user.displayName) ||
    cleanText(fullName) ||
    cleanText(user.email?.split("@")[0]) ||
    "Verified Member"
  );
}

function isSafeImageUrl(value = "") {
  const url = cleanText(value);

  if (!url) return true;

  return (
    /^https?:\/\/[^\s]+$/i.test(url) ||
    url.startsWith("/uploads") ||
    url.startsWith("uploads/")
  );
}

function getImageFromUser(user = {}) {
  return (
    cleanText(user.image) ||
    cleanText(user.avatar) ||
    cleanText(user.profileImage) ||
    ""
  );
}

export async function createTestimonial(req, res) {
  try {
    const { message, rating = 5, name = "", imageUrl = "" } = req.body;

    const finalMessage = cleanText(message);
    const finalName = cleanText(name);
    const authUserId = req.user?._id || req.user?.id;

    if (!authUserId || !isValidObjectId(authUserId)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized.",
      });
    }

    if (!finalName || finalName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your display name.",
      });
    }

    if (!finalMessage || finalMessage.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Message is required. Minimum 3 characters.",
      });
    }

    if (finalMessage.length > 1200) {
      return res.status(400).json({
        success: false,
        message: "Message must be at most 1200 characters.",
      });
    }

    if (countLinks(finalMessage) >= 2 || hasRepeatSpam(finalMessage)) {
      return res.status(400).json({
        success: false,
        message: "Message looks like spam. Please rewrite and try again.",
      });
    }

    const authUser = await User.findById(authUserId)
      .select(userPublicFields)
      .lean();

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    const existingTestimonial = await Testimonial.findOne({
      user: authUserId,
    }).select("_id");

    if (existingTestimonial) {
      return res.status(409).json({
        success: false,
        message:
          "You already submitted a testimonial. You can only submit one testimonial per account.",
      });
    }

    let finalImageUrl = "";

    if (req.file?.filename) {
      finalImageUrl = `/uploads/testimonials/${req.file.filename}`;
    } else if (imageUrl) {
      if (!isSafeImageUrl(imageUrl)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid image URL.",
        });
      }

      finalImageUrl = cleanText(imageUrl);
    } else {
      finalImageUrl = getImageFromUser(authUser);
    }

    const created = await Testimonial.create({
      imageUrl: finalImageUrl,
      message: finalMessage,
      rating: clampRating(rating),
      name: getBestUserName(authUser, finalName),
      user: authUserId,
    });

    const testimonial = await Testimonial.findById(created._id)
      .populate("user", userPublicFields)
      .lean();

    return res.status(201).json({
      success: true,
      testimonial,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You already submitted a testimonial. You can only submit one testimonial per account.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create testimonial",
    });
  }
}

export async function getTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial id.",
      });
    }

    const testimonial = await Testimonial.findById(id)
      .populate("user", userPublicFields)
      .lean();

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    return res.status(200).json({
      success: true,
      testimonial,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonial",
    });
  }
}

export async function getAllTestimonials(req, res) {
  try {
    const pageRaw = Number(req.query.page ?? 1);
    const limitRaw = Number(req.query.limit ?? 20);

    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(50, Math.floor(limitRaw))
        : 20;

    const skip = (page - 1) * limit;

    const [total, testimonials] = await Promise.all([
      Testimonial.countDocuments({ approved: true }),

      Testimonial.find({ approved: true })
        .select(
          "_id imageUrl message rating name approved user createdAt updatedAt",
        )
        .populate("user", userPublicFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      testimonials,
      results: testimonials.length,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
    });
  }
}

export async function updateTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial id.",
      });
    }

    const payload = {};

    if (req.file?.filename) {
      payload.imageUrl = `/uploads/testimonials/${req.file.filename}`;
    } else if ("imageUrl" in req.body) {
      const nextImageUrl = cleanText(req.body.imageUrl);

      if (nextImageUrl && !isSafeImageUrl(nextImageUrl)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid image URL.",
        });
      }

      payload.imageUrl = nextImageUrl;
    }

    if ("message" in req.body) {
      const newMessage = cleanText(req.body.message);

      if (!newMessage || newMessage.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Message is required. Minimum 3 characters.",
        });
      }

      if (newMessage.length > 1200) {
        return res.status(400).json({
          success: false,
          message: "Message must be at most 1200 characters.",
        });
      }

      if (countLinks(newMessage) >= 2 || hasRepeatSpam(newMessage)) {
        return res.status(400).json({
          success: false,
          message: "Message looks like spam. Please rewrite and try again.",
        });
      }

      payload.message = newMessage;
    }

    if ("rating" in req.body) {
      payload.rating = clampRating(req.body.rating);
    }

    if ("name" in req.body) {
      const nextName = cleanText(req.body.name);

      if (!nextName || nextName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters.",
        });
      }

      payload.name = nextName;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid testimonial changes provided.",
      });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("user", userPublicFields)
      .lean();

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    return res.status(200).json({
      success: true,
      testimonial,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update testimonial",
    });
  }
}

export async function deleteTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial id.",
      });
    }

    const deleted = await Testimonial.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    return res.status(200).json({
      success: true,
      ok: true,
      deletedId: id,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete testimonial",
    });
  }
}

export async function getAllTestimonialsAdmin(req, res) {
  try {
    const testimonials = await Testimonial.find({})
      .populate("user", userPublicFields)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      testimonials,
      results: testimonials.length,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin testimonials",
    });
  }
}

export async function approveTestimonial(req, res) {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial id.",
      });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { approved: Boolean(approved) },
      { new: true, runValidators: true },
    )
      .populate("user", userPublicFields)
      .lean();

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found.",
      });
    }

    return res.status(200).json({
      success: true,
      testimonial,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to approve testimonial",
    });
  }
}
