// controllers/adminEmailTemplateController.js
import EmailTemplate, {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_STATUSES,
  isValidHttpUrl,
} from "../models/emailTemplateModel.js";

function cleanString(value, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeTemplate(template) {
  if (!template) return null;

  const item = template.toObject ? template.toObject() : template;

  return {
    _id: item._id,
    name: item.name || "",
    subject: item.subject || "",
    previewText: item.previewText || "",
    headline: item.headline || "",
    body: item.body || "",
    ctaText: item.ctaText || "Learn More",
    ctaUrl: item.ctaUrl || "",
    category: item.category || "newsletter",
    status: item.status || (item.isActive ? "active" : "draft"),
    isActive: item.isActive ?? false,
    usageCount: item.usageCount || 0,
    lastUsedAt: item.lastUsedAt || null,
    notes: item.notes || "",
    version: item.version || 1,
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildTemplatePayload(body = {}, isCreate = false) {
  const payload = {};

  if (body.name !== undefined || isCreate) {
    payload.name = cleanString(body.name, 120);
  }

  if (body.subject !== undefined || isCreate) {
    payload.subject = cleanString(body.subject, 180);
  }

  if (body.previewText !== undefined) {
    payload.previewText = cleanString(body.previewText, 220);
  }

  if (body.headline !== undefined || isCreate) {
    payload.headline = cleanString(body.headline, 180);
  }

  if (body.body !== undefined || isCreate) {
    payload.body = cleanString(body.body, 12000);
  }

  if (body.ctaText !== undefined) {
    payload.ctaText = cleanString(body.ctaText, 60) || "Learn More";
  }

  if (body.ctaUrl !== undefined) {
    payload.ctaUrl = cleanString(body.ctaUrl, 500);

    if (payload.ctaUrl && !isValidHttpUrl(payload.ctaUrl)) {
      const error = new Error("CTA URL must be a valid http or https URL");
      error.statusCode = 400;
      throw error;
    }
  }

  if (body.category !== undefined) {
    const category = cleanString(body.category, 40).toLowerCase();

    if (!EMAIL_TEMPLATE_CATEGORIES.includes(category)) {
      const error = new Error("Invalid email template category");
      error.statusCode = 400;
      throw error;
    }

    payload.category = category;
  }

  if (body.status !== undefined) {
    const status = cleanString(body.status, 40).toLowerCase();

    if (!EMAIL_TEMPLATE_STATUSES.includes(status)) {
      const error = new Error("Invalid email template status");
      error.statusCode = 400;
      throw error;
    }

    payload.status = status;
    payload.isActive = status === "active";
  }

  if (body.isActive !== undefined && body.status === undefined) {
    payload.isActive = Boolean(body.isActive);
    payload.status = payload.isActive ? "active" : "inactive";
  }

  if (body.notes !== undefined) {
    payload.notes = cleanString(body.notes, 1000);
  }

  return payload;
}

function validateRequiredTemplateFields(payload) {
  if (!payload.name || !payload.subject || !payload.headline || !payload.body) {
    return "Name, subject, headline, and body are required";
  }

  if (payload.name.length < 2) {
    return "Template name must be at least 2 characters";
  }

  if (payload.subject.length < 2) {
    return "Subject must be at least 2 characters";
  }

  if (payload.headline.length < 2) {
    return "Headline must be at least 2 characters";
  }

  if (payload.body.length < 10) {
    return "Email body must be at least 10 characters";
  }

  return null;
}

export async function createEmailTemplate(req, res, next) {
  try {
    const payload = buildTemplatePayload(req.body, true);
    const fieldError = validateRequiredTemplateFields(payload);

    if (fieldError) {
      return res.status(400).json({
        success: false,
        message: fieldError,
      });
    }

    const template = await EmailTemplate.create({
      ...payload,
      category: payload.category || "newsletter",
      status: payload.status || "draft",
      isActive: payload.status === "active",
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Email template created successfully",
      data: safeTemplate(template),
      template: safeTemplate(template),
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailTemplates(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const search = cleanString(req.query.search || req.query.q || "", 120);
    const category = cleanString(req.query.category || "", 40).toLowerCase();
    const status = cleanString(req.query.status || "", 40).toLowerCase();
    const isActive = req.query.isActive;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      updated: { updatedAt: -1 },
      name: { name: 1 },
      category: { category: 1 },
      mostUsed: { usageCount: -1 },
      lastUsed: { lastUsedAt: -1 },
    };

    const sort = sortMap[req.query.sort] || sortMap.newest;

    const query = {};

    if (search) {
      const escaped = escapeRegex(search);

      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { subject: { $regex: escaped, $options: "i" } },
        { headline: { $regex: escaped, $options: "i" } },
        { previewText: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category && EMAIL_TEMPLATE_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (status && EMAIL_TEMPLATE_STATUSES.includes(status)) {
      query.status = status;
    }

    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;

    const [templates, total, summaryRows] = await Promise.all([
      EmailTemplate.find(query).sort(sort).skip(skip).limit(limit).lean(),
      EmailTemplate.countDocuments(query),
      EmailTemplate.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            usageCount: { $sum: "$usageCount" },
          },
        },
      ]),
    ]);

    const summary = {
      totalAll: 0,
      draft: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      usageCount: 0,
    };

    summaryRows.forEach((item) => {
      const key = item._id || "draft";

      if (key in summary) {
        summary[key] = item.count || 0;
      }

      summary.totalAll += item.count || 0;
      summary.usageCount += item.usageCount || 0;
    });

    const safeData = templates.map(safeTemplate);

    return res.status(200).json({
      success: true,
      count: safeData.length,
      total,
      summary,
      data: safeData,
      templates: safeData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailTemplateById(req, res, next) {
  try {
    const template = await EmailTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeTemplate(template),
      template: safeTemplate(template),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailTemplate(req, res, next) {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    const payload = buildTemplatePayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    Object.assign(template, payload);
    template.updatedBy = req.user?._id || template.updatedBy || null;

    const fieldError = validateRequiredTemplateFields({
      name: template.name,
      subject: template.subject,
      headline: template.headline,
      body: template.body,
    });

    if (fieldError) {
      return res.status(400).json({
        success: false,
        message: fieldError,
      });
    }

    await template.save();

    return res.status(200).json({
      success: true,
      message: "Email template updated successfully",
      data: safeTemplate(template),
      template: safeTemplate(template),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmailTemplate(req, res, next) {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email template deleted successfully",
      data: {
        id: req.params.id,
      },
    });
  } catch (error) {
    next(error);
  }
}