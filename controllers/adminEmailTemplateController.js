import mongoose from "mongoose";
import EmailTemplate from "../models/EmailTemplateModel.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const createEmailTemplate = async (req, res) => {
  try {
    const {
      name,
      subject,
      previewText,
      headline,
      body,
      ctaText,
      ctaUrl,
      category,
      isActive,
    } = req.body;

    if (!name || !subject || !headline || !body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, headline, and body are required.",
      });
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      previewText,
      headline,
      body,
      ctaText,
      ctaUrl,
      category,
      isActive,
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Email template created successfully.",
      template,
    });
  } catch (error) {
    console.error("Create email template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create email template.",
    });
  }
};

export const getEmailTemplates = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { headline: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const templates = await EmailTemplate.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Get email templates error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email templates.",
    });
  }
};

export const getEmailTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template id.",
      });
    }

    const template = await EmailTemplate.findById(id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Get email template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email template.",
    });
  }
};

export const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template id.",
      });
    }

    const allowed = [
      "name",
      "subject",
      "previewText",
      "headline",
      "body",
      "ctaText",
      "ctaUrl",
      "category",
      "isActive",
    ];

    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    const template = await EmailTemplate.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email template updated successfully.",
      template,
    });
  } catch (error) {
    console.error("Update email template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update email template.",
    });
  }
};

export const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template id.",
      });
    }

    const template = await EmailTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email template deleted successfully.",
    });
  } catch (error) {
    console.error("Delete email template error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete email template.",
    });
  }
};