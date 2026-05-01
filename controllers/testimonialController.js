import mongoose from "mongoose";
import Testimonial from "../models/Testimonial.js";

function clampRating(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.min(5, Math.max(1, x));
}

function cleanText(v) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function countLinks(text = "") {
  const t = String(text);
  const links = t.match(/https?:\/\/|www\./gi);
  return links ? links.length : 0;
}

function hasRepeatSpam(text = "") {
  const t = String(text);
  return /([a-zA-Z0-9!?.])\1{9,}/.test(t); // 10+ repeats
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function createTestimonial(req, res) {
  try {
    const { message, rating = 5, name = "", imageUrl = "" } = req.body;

    const finalMessage = cleanText(message);
    const finalName = cleanText(name);

    if (!finalMessage || finalMessage.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Message is required (min 3 chars)",
      });
    }

    if (countLinks(finalMessage) >= 2 || hasRepeatSpam(finalMessage)) {
      return res.status(400).json({
        success: false,
        message: "Message looks like spam. Please rewrite and try again.",
      });
    }

    // ✅ ADD IT HERE 👇
    const authUserId = req.user?._id || req.user?.id;
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized.",
      });
    }

    // prefer uploaded file over imageUrl string
    let finalImageUrl = "";
    if (req.file && req.file.filename) {
      finalImageUrl = `/uploads/testimonials/${req.file.filename}`;
    } else if (imageUrl) {
      finalImageUrl = cleanText(imageUrl);
    }

    const doc = await Testimonial.create({
      imageUrl: finalImageUrl,
      message: finalMessage,
      rating: clampRating(rating),
      name: finalName,
      user: authUserId, // ✅ now forced from auth
    });

    return res.status(201).json({
      success: true,
      testimonial: doc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to create testimonial",
      err: err.message,
    });
  }
}

export async function getTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid testimonial id." });
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: "Testimonial not found." });
    }

    return res.status(200).json({ success: true, testimonial });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      err: error.message,
    });
  }
}

export async function getAllTestimonials(req, res) {
  try {
    const pageRaw = Number(req.query.page ?? 1);
    const limitRaw = Number(req.query.limit ?? 20);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

    // ✅ clamp limit (max 50)
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 20;

    const skip = (page - 1) * limit;

    const [total, testimonials] = await Promise.all([
      Testimonial.countDocuments({}),
      Testimonial.find({})
        .select("_id imageUrl message rating name createdAt") // ✅ PUBLIC SAFE FIELDS ONLY
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      testimonials,
      results: testimonials.length,
      total,
      page,
      limit,
      pages,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
      err: err.message,
    });
  }
};

export async function updateTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid testimonial id." });
    }

    const payload = {};

    // ✅ imageUrl updates
    if (req.file && req.file.filename) {
      payload.imageUrl = `/uploads/testimonials/${req.file.filename}`;
    } else if ("imageUrl" in req.body) {
      payload.imageUrl = cleanText(req.body.imageUrl);
    }

    // ✅ message updates (block empty/junk)
    if ("message" in req.body) {
      const newMsg = cleanText(req.body.message);
      if (!newMsg || newMsg.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Message is required (min 3 chars)",
        });
      }
      if (countLinks(newMsg) >= 2 || hasRepeatSpam(newMsg)) {
        return res.status(400).json({
          success: false,
          message: "Message looks like spam. Please rewrite and try again.",
        });
      }
      payload.message = newMsg;
    }

    // ✅ rating/name updates
    if ("rating" in req.body) payload.rating = clampRating(req.body.rating);
    if ("name" in req.body) payload.name = cleanText(req.body.name);

    // ✅ IMPORTANT: do NOT allow updating user via body
    // If you ever truly need this, we can create a dedicated admin-only endpoint later.

    const updated = await Testimonial.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true, // ✅ enforce schema rules on update
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    return res.status(200).json({ success: true, testimonial: updated });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update testimonial",
      err: err.message,
    });
  }
}

export async function deleteTestimonial(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid testimonial id." });
    }

    const deleted = await Testimonial.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    return res.status(200).json({ success: true, ok: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete testimonial",
      err: err.message,
    });
  }
}

