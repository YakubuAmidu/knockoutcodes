// controllers/emailCampaignController.js
import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailSubscriber from "../models/emailSubscriberModel.js";

const ALLOWED_STATUSES = ["draft", "scheduled", "sending", "sent", "failed", "paused"];
const ALLOWED_AUDIENCE_TYPES = ["all", "newsletter", "customers", "manual"];

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeString(value, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function sanitizeEmailArray(value) {
  const rawList = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim());

  return [
    ...new Set(
      rawList
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function normalizeAudienceType(value) {
  const normalized = sanitizeString(value, 30).toLowerCase();
  return ALLOWED_AUDIENCE_TYPES.includes(normalized) ? normalized : "newsletter";
}

function parseScheduledDate(value) {
  if (!value) return null;
  const scheduledFor = new Date(value);
  return Number.isNaN(scheduledFor.getTime()) ? null : scheduledFor;
}

function isValidHttpUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateManualRecipients(audienceType, manualRecipients) {
  if (audienceType !== "manual") return null;

  if (!manualRecipients.length) {
    return "At least one manual recipient email is required";
  }

  const invalidEmails = manualRecipients.filter((email) => !EMAIL_REGEX.test(email));

  if (invalidEmails.length) {
    return `Invalid manual recipient email: ${invalidEmails[0]}`;
  }

  return null;
}

function safeCampaign(campaign) {
  if (!campaign) return null;

  const item = campaign.toObject ? campaign.toObject() : campaign;

  return {
    _id: item._id,
    name: item.name,
    subject: item.subject,
    previewText: item.previewText || "",
    brandName: item.brandName || "KnockoutCodes",
    headline: item.headline,
    subheadline: item.subheadline || "",
    body: item.body,
    ctaText: item.ctaText || "Shop Now",
    ctaUrl: item.ctaUrl || "",
    signature: item.signature || "Team KnockoutCodes",
    audienceType: item.audienceType || "newsletter",
    manualRecipients: item.manualRecipients || [],
    status: item.status || "draft",
    scheduledFor: item.scheduledFor || null,
    sentAt: item.sentAt || null,
    totalRecipients: item.totalRecipients || 0,
    totalSent: item.totalSent || 0,
    totalFailed: item.totalFailed || 0,
    totalUnsubscribed: item.totalUnsubscribed || 0,
    failedRecipients: item.failedRecipients || [],
    lastError: item.lastError || "",
    retryCount: item.retryCount || 0,
    processingLockedAt: item.processingLockedAt || null,
    processingLockId: item.processingLockId || "",
    lastAttemptAt: item.lastAttemptAt || null,
    allowUnsubscribe: item.allowUnsubscribe ?? true,
    createdBy: item.createdBy || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createEmailCampaign(req, res, next) {
  try {
    const name = sanitizeString(req.body.name, 120);
    const subject = sanitizeString(req.body.subject, 200);
    const headline = sanitizeString(req.body.headline, 180);
    const body = sanitizeString(req.body.body, 12000);
    const ctaUrl = sanitizeString(req.body.ctaUrl, 500);
    const audienceType = normalizeAudienceType(req.body.audienceType);
    const manualRecipients = sanitizeEmailArray(req.body.manualRecipients);

    if (!name || !subject || !headline || !body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, headline, and body are required",
      });
    }

    if (ctaUrl && !isValidHttpUrl(ctaUrl)) {
      return res.status(400).json({
        success: false,
        message: "CTA URL must be a valid http or https URL",
      });
    }

    const recipientError = validateManualRecipients(audienceType, manualRecipients);

    if (recipientError) {
      return res.status(400).json({
        success: false,
        message: recipientError,
      });
    }

    const campaign = await EmailCampaign.create({
      name,
      subject,
      previewText: sanitizeString(req.body.previewText, 220),
      brandName: sanitizeString(req.body.brandName, 80) || "KnockoutCodes",
      headline,
      subheadline: sanitizeString(req.body.subheadline, 300),
      body,
      ctaText: sanitizeString(req.body.ctaText, 60) || "Shop Now",
      ctaUrl,
      signature: sanitizeString(req.body.signature, 120) || "Team KnockoutCodes",
      audienceType,
      manualRecipients,
      status: "draft",
      scheduledFor: null,
      allowUnsubscribe: req.body.allowUnsubscribe ?? true,
      createdBy: req.user._id,
    });

    const populatedCampaign = await EmailCampaign.findById(campaign._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(201).json({
      success: true,
      message: "Email campaign created successfully",
      data: safeCampaign(populatedCampaign),
      campaign: safeCampaign(populatedCampaign),
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailCampaigns(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const search = sanitizeString(req.query.search || req.query.q || "", 120);
    const status = sanitizeString(req.query.status || "", 30).toLowerCase();

    const query = {};
    const escapedSearch = escapeRegex(search);

    if (escapedSearch) {
      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { subject: { $regex: escapedSearch, $options: "i" } },
        { headline: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (status && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    }

    const [campaigns, total] = await Promise.all([
      EmailCampaign.find(query)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EmailCampaign.countDocuments(query),
    ]);

    const safeData = campaigns.map(safeCampaign);

    return res.status(200).json({
      success: true,
      count: safeData.length,
      total,
      data: safeData,
      campaigns: safeData,
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

export async function getEmailCampaignById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeCampaign(campaign),
      campaign: safeCampaign(campaign),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailCampaign(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (["sent", "sending"].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: "Sent or sending campaigns cannot be edited",
      });
    }

    const fieldMap = {
      name: 120,
      subject: 200,
      previewText: 220,
      brandName: 80,
      headline: 180,
      subheadline: 300,
      body: 12000,
      ctaText: 60,
      ctaUrl: 500,
      signature: 120,
    };

    for (const [field, maxLength] of Object.entries(fieldMap)) {
      if (req.body[field] !== undefined) {
        campaign[field] = sanitizeString(req.body[field], maxLength);
      }
    }

    if (!campaign.name || !campaign.subject || !campaign.headline || !campaign.body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, headline, and body cannot be empty",
      });
    }

    if (campaign.ctaUrl && !isValidHttpUrl(campaign.ctaUrl)) {
      return res.status(400).json({
        success: false,
        message: "CTA URL must be a valid http or https URL",
      });
    }

    if (req.body.audienceType !== undefined) {
      campaign.audienceType = normalizeAudienceType(req.body.audienceType);
    }

    if (req.body.manualRecipients !== undefined) {
      campaign.manualRecipients = sanitizeEmailArray(req.body.manualRecipients);
    }

    const recipientError = validateManualRecipients(
      campaign.audienceType,
      campaign.manualRecipients
    );

    if (recipientError) {
      return res.status(400).json({
        success: false,
        message: recipientError,
      });
    }

    if (req.body.allowUnsubscribe !== undefined) {
      campaign.allowUnsubscribe = Boolean(req.body.allowUnsubscribe);
    }

    if (req.body.scheduledFor !== undefined) {
      if (!req.body.scheduledFor) {
        campaign.scheduledFor = null;

        if (campaign.status === "scheduled") {
          campaign.status = "draft";
        }
      } else {
        const scheduledFor = parseScheduledDate(req.body.scheduledFor);

        if (!scheduledFor || scheduledFor <= new Date()) {
          return res.status(400).json({
            success: false,
            message: "scheduledFor must be a valid future date",
          });
        }

        campaign.scheduledFor = scheduledFor;
        campaign.status = "scheduled";
      }
    }

    await campaign.save();

    const populatedCampaign = await EmailCampaign.findById(campaign._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(200).json({
      success: true,
      message: "Email campaign updated successfully",
      data: safeCampaign(populatedCampaign),
      campaign: safeCampaign(populatedCampaign),
    });
  } catch (error) {
    next(error);
  }
}

export async function scheduleEmailCampaign(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (["sent", "sending"].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: "This campaign can no longer be scheduled",
      });
    }

    const scheduledFor = parseScheduledDate(req.body.scheduledFor);

    if (!scheduledFor || scheduledFor <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduledFor must be a valid future date",
      });
    }

    campaign.scheduledFor = scheduledFor;
    campaign.status = "scheduled";
    campaign.lastError = "";

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Email campaign scheduled successfully",
      data: safeCampaign(campaign),
      campaign: safeCampaign(campaign),
    });
  } catch (error) {
    next(error);
  }
}

export async function pauseEmailCampaign(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (["sent", "sending"].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: "Sent or sending campaigns cannot be paused",
      });
    }

    campaign.status = "paused";
    campaign.scheduledFor = null;

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Email campaign paused successfully",
      data: safeCampaign(campaign),
      campaign: safeCampaign(campaign),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmailCampaign(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "A sending campaign cannot be deleted",
      });
    }

    await campaign.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Email campaign deleted successfully",
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
}
