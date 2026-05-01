import mongoose from "mongoose";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";
import { renderCampaignEmail } from "../utils/emailTemplates/renderEmailTemplate.js";
import { sendMail } from "../utils/mailer.js";
import { resolveCampaignRecipients } from "../services/emailCampaignRecipientService.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getBaseUrl(req) {
  const envBase =
    // eslint-disable-next-line no-undef
    process.env.APP_BASE_URL ||
    // eslint-disable-next-line no-undef
    process.env.CLIENT_URL ||
    // eslint-disable-next-line no-undef
    process.env.SERVER_URL ||
    "";

  if (envBase) {
    return String(envBase).trim().replace(/\/+$/, "");
  }

  if (req?.protocol && req?.get) {
    return `${req.protocol}://${req.get("host")}`;
  }

  return "http://localhost:5000";
}

function safeErrorMessage(error) {
  return String(
    error?.response?.data?.message ||
      error?.message ||
      "Email sending failed"
  ).slice(0, 500);
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

async function populateCampaign(campaignId) {
  return EmailCampaign.findById(campaignId).populate("createdBy", "name email");
}

async function sendCampaignToRecipients({ campaign, recipients, baseUrl }) {
  let totalSent = 0;
  let totalFailed = 0;
  const failedRecipients = [];

  for (const emailValue of recipients) {
    const email = String(emailValue || "").trim().toLowerCase();

    if (!email) continue;

    let log = await EmailCampaignLog.findOne({
      campaign: campaign._id,
      email,
    });

    if (!log) {
      log = await EmailCampaignLog.create({
        campaign: campaign._id,
        email,
        status: "pending",
      });
    } else {
      log.status = "pending";
      log.errorMessage = "";
      await log.save();
    }

    try {
      const { html, text } = renderCampaignEmail({
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
        unsubscribeUrl: `${baseUrl}/api/v1/email-campaigns/unsubscribe?email=${encodeURIComponent(email)}&campaign=${campaign._id}`,
        logId: log._id.toString(),
        campaignId: campaign._id.toString(),
        baseUrl,
      });

      const mailResult = await sendMail({
        to: email,
        subject: campaign.subject,
        html,
        text,
      });

      log.status = "sent";
      log.sentAt = new Date();
      log.errorMessage = "";
      log.providerMessageId = String(
        mailResult?.messageId ||
          mailResult?.providerMessageId ||
          mailResult?.id ||
          ""
      ).slice(0, 300);

      await log.save();
      totalSent += 1;
    } catch (error) {
  const message = safeErrorMessage(error);

  log.status = "failed";
  log.errorMessage = message;
  await log.save();

  totalFailed += 1;

  failedRecipients.push({
    email,
    error: message,
  });
}
  }

  campaign.totalRecipients = recipients.length;
  campaign.totalSent = totalSent;
  campaign.totalFailed = totalFailed;
  campaign.failedRecipients = failedRecipients;
  campaign.lastError =
    failedRecipients.length > 0 ? failedRecipients[0].error : "";
  campaign.sentAt = totalSent > 0 ? new Date() : campaign.sentAt;
  campaign.status = totalFailed > 0 && totalSent === 0 ? "failed" : "sent";
  campaign.processingLockedAt = null;
  campaign.processingLockId = "";

  await campaign.save();

  return {
    campaign: await populateCampaign(campaign._id),
    summary: {
      totalRecipients: recipients.length,
      totalSent,
      totalFailed,
      failedRecipients,
    },
  };
}

export async function sendCampaignById(campaignId, options = {}) {
  if (!isValidObjectId(campaignId)) {
    throw new Error("Invalid campaign id");
  }

  const campaign = await EmailCampaign.findById(campaignId);

  if (!campaign) {
    throw new Error("Email campaign not found");
  }

  if (campaign.status === "sending") {
    throw new Error("This campaign is already sending");
  }

  if (campaign.status === "sent") {
    throw new Error("This campaign has already been sent");
  }

  const recipients = await resolveCampaignRecipients(campaign);

  if (!recipients.length) {
    throw new Error("No valid recipients found for this campaign");
  }

  const baseUrl = getBaseUrl(options.req);

  campaign.status = "sending";
  campaign.processingLockedAt = new Date();
  campaign.processingLockId = new mongoose.Types.ObjectId().toString();
  campaign.lastError = "";
  await campaign.save();

  return sendCampaignToRecipients({
    campaign,
    recipients,
    baseUrl,
  });
}

export const sendEmailCampaignNow = async (req, res, next) => {
  try {
    const result = await sendCampaignById(req.params.id, { req });

    return res.status(200).json({
      success: true,
      message: "Email campaign sent successfully",
      data: safeCampaign(result.campaign),
      meta: result.summary,
    });
  } catch (error) {
    if (
      error.message === "Invalid campaign id" ||
      error.message === "No valid recipients found for this campaign" ||
      error.message === "This campaign is already sending" ||
      error.message === "This campaign has already been sent"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Email campaign not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const retryFailedCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign id",
      });
    }

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Email campaign not found",
      });
    }

    if (campaign.status === "sending") {
      return res.status(400).json({
        success: false,
        message: "This campaign is currently sending and cannot be retried",
      });
    }

    const failedLogs = await EmailCampaignLog.find({
      campaign: campaign._id,
      status: "failed",
    }).select("email");

    const recipients = failedLogs.map((item) => item.email).filter(Boolean);

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: "There are no failed recipients to retry",
      });
    }

    const baseUrl = getBaseUrl(req);

    campaign.status = "sending";
    campaign.processingLockedAt = new Date();
    campaign.processingLockId = new mongoose.Types.ObjectId().toString();
    campaign.retryCount = Number(campaign.retryCount || 0) + 1;
    campaign.lastError = "";
    await campaign.save();

    const result = await sendCampaignToRecipients({
      campaign,
      recipients,
      baseUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Failed campaign emails retried successfully",
      data: safeCampaign(result.campaign),
      meta: result.summary,
    });
  } catch (error) {
    next(error);
  }
};