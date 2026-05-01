import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";

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
  if (!value) return [];

  const items = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(items.map((item) => item.trim().toLowerCase()))];
}

function normalizeAudienceType(value) {
  const allowed = ["all", "newsletter", "customers", "manual"];
  const normalized = sanitizeString(value, 20).toLowerCase();
  return allowed.includes(normalized) ? normalized : "newsletter";
}

function safeCampaign(campaign) {
  return {
    _id: campaign._id,
    name: campaign.name,
    subject: campaign.subject,
    previewText: campaign.previewText,
    brandName: campaign.brandName,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    body: campaign.body,
    ctaText: campaign.ctaText,
    ctaUrl: campaign.ctaUrl,
    signature: campaign.signature,
    audienceType: campaign.audienceType,
    manualRecipients: campaign.manualRecipients,
    status: campaign.status,
    scheduledFor: campaign.scheduledFor,
    sentAt: campaign.sentAt,
    totalRecipients: campaign.totalRecipients,
    totalSent: campaign.totalSent,
    totalFailed: campaign.totalFailed,
    totalUnsubscribed: campaign.totalUnsubscribed || 0,
    failedRecipients: campaign.failedRecipients || [],
    lastError: campaign.lastError || "",
    retryCount: campaign.retryCount || 0,
    processingLockedAt: campaign.processingLockedAt || null,
    processingLockId: campaign.processingLockId || "",
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

function parseScheduledDate(value) {
  if (!value) return null;

  const scheduledFor = new Date(value);
  if (Number.isNaN(scheduledFor.getTime())) return null;

  return scheduledFor;
}

export async function createEmailCampaign(req, res, next) {
  try {
    const name = sanitizeString(req.body.name, 120);
    const subject = sanitizeString(req.body.subject, 200);
    const headline = sanitizeString(req.body.headline, 180);
    const body = sanitizeString(req.body.body, 12000);
    const audienceType = normalizeAudienceType(req.body.audienceType);
    const manualRecipients = sanitizeEmailArray(req.body.manualRecipients);

    if (!name || !subject || !headline || !body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, headline, and body are required",
      });
    }

    if (audienceType === "manual" && manualRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one manual recipient email is required",
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
      ctaUrl: sanitizeString(req.body.ctaUrl, 500),
      signature:
        sanitizeString(req.body.signature, 120) || "Team KnockoutCodes",
      audienceType,
      manualRecipients,
      status: "draft",
      scheduledFor: null,
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

    const search = sanitizeString(req.query.search || "", 120);
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

    const allowedStatuses = [
      "draft",
      "scheduled",
      "sending",
      "sent",
      "failed",
      "paused",
    ];

    if (status && allowedStatuses.includes(status)) {
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

    return res.status(200).json({
      success: true,
      data: campaigns.map(safeCampaign),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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

    if (campaign.status === "sent" || campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "Sent or sending campaigns cannot be edited",
      });
    }

    const nextName = sanitizeString(req.body.name, 120);
    const nextSubject = sanitizeString(req.body.subject, 200);
    const nextHeadline = sanitizeString(req.body.headline, 180);
    const nextBody = sanitizeString(req.body.body, 12000);

    if (req.body.name !== undefined && !nextName) {
      return res.status(400).json({
        success: false,
        message: "Campaign name cannot be empty",
      });
    }

    if (req.body.subject !== undefined && !nextSubject) {
      return res.status(400).json({
        success: false,
        message: "Campaign subject cannot be empty",
      });
    }

    if (req.body.headline !== undefined && !nextHeadline) {
      return res.status(400).json({
        success: false,
        message: "Campaign headline cannot be empty",
      });
    }

    if (req.body.body !== undefined && !nextBody) {
      return res.status(400).json({
        success: false,
        message: "Campaign body cannot be empty",
      });
    }

    if (req.body.name !== undefined) campaign.name = nextName;
    if (req.body.subject !== undefined) campaign.subject = nextSubject;
    if (req.body.previewText !== undefined) {
      campaign.previewText = sanitizeString(req.body.previewText, 220);
    }
    if (req.body.brandName !== undefined) {
      campaign.brandName =
        sanitizeString(req.body.brandName, 80) || campaign.brandName;
    }
    if (req.body.headline !== undefined) campaign.headline = nextHeadline;
    if (req.body.subheadline !== undefined) {
      campaign.subheadline = sanitizeString(req.body.subheadline, 300);
    }
    if (req.body.body !== undefined) campaign.body = nextBody;
    if (req.body.ctaText !== undefined) {
      campaign.ctaText = sanitizeString(req.body.ctaText, 60) || "Shop Now";
    }
    if (req.body.ctaUrl !== undefined) {
      campaign.ctaUrl = sanitizeString(req.body.ctaUrl, 500);
    }
    if (req.body.signature !== undefined) {
      campaign.signature =
        sanitizeString(req.body.signature, 120) || "Team KnockoutCodes";
    }
    if (req.body.audienceType !== undefined) {
      campaign.audienceType = normalizeAudienceType(req.body.audienceType);
    }

    if (req.body.manualRecipients !== undefined) {
      campaign.manualRecipients = sanitizeEmailArray(req.body.manualRecipients);
    }

    if (
      campaign.audienceType === "manual" &&
      (!campaign.manualRecipients || campaign.manualRecipients.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one manual recipient email is required",
      });
    }

    if (req.body.scheduledFor !== undefined) {
      if (!req.body.scheduledFor) {
        campaign.scheduledFor = null;
        if (campaign.status === "scheduled") {
          campaign.status = "draft";
        }
      } else {
        const scheduledFor = parseScheduledDate(req.body.scheduledFor);

        if (!scheduledFor) {
          return res.status(400).json({
            success: false,
            message: "A valid scheduledFor date is required",
          });
        }

        if (scheduledFor <= new Date()) {
          return res.status(400).json({
            success: false,
            message: "scheduledFor must be a future date",
          });
        }

        campaign.scheduledFor = scheduledFor;
        campaign.status = "scheduled";
      }
    } else if (
      campaign.status === "scheduled" &&
      !campaign.scheduledFor
    ) {
      campaign.status = "draft";
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

    if (campaign.status === "sent" || campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "This campaign can no longer be scheduled",
      });
    }

    const scheduledFor = parseScheduledDate(req.body.scheduledFor);

    if (!scheduledFor) {
      return res.status(400).json({
        success: false,
        message: "A valid scheduledFor date is required",
      });
    }

    if (scheduledFor <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "scheduledFor must be a future date",
      });
    }

    campaign.scheduledFor = scheduledFor;
    campaign.status = "scheduled";

    await campaign.save();

    const populatedCampaign = await EmailCampaign.findById(campaign._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(200).json({
      success: true,
      message: "Email campaign scheduled successfully",
      data: safeCampaign(populatedCampaign),
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

    if (campaign.status === "sent") {
      return res.status(400).json({
        success: false,
        message: "Sent campaigns cannot be paused",
      });
    }

    if (campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "Sending campaigns cannot be paused",
      });
    }

    campaign.status = "paused";
    await campaign.save();

    const populatedCampaign = await EmailCampaign.findById(campaign._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(200).json({
      success: true,
      message: "Email campaign paused successfully",
      data: safeCampaign(populatedCampaign),
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
    });
  } catch (error) {
    next(error);
  }
}