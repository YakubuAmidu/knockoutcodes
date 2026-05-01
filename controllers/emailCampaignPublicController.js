// controllers/emailCampaignPublicController.js
import mongoose from "mongoose";
import EmailUnsubscribe from "../models/EmailUnsubScribeModel.js";
import EmailCampaignLog from "../models/EmailCampaignLogModel.js";
import EmailCampaign from "../models/EmailCampaignModel.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(
    normalizeEmail(email)
  );
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function refreshCampaignUnsubscribeCount(campaignId) {
  const unsubscribedCount = await EmailCampaignLog.countDocuments({
    campaign: campaignId,
    status: "unsubscribed",
  });

  await EmailCampaign.findByIdAndUpdate(campaignId, {
    $set: {
      totalUnsubscribed: unsubscribedCount,
    },
  });
}

function renderUnsubscribeHtml(email) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unsubscribed</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #0b0b0b;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            width: 100%;
            max-width: 560px;
            background: #111111;
            border: 1px solid #222222;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
            text-align: center;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 28px;
          }
          p {
            margin: 0;
            color: #d1d5db;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>You have been unsubscribed</h1>
          <p>${email} has been removed from future email campaigns.</p>
        </div>
      </body>
    </html>
  `;
}

export async function unsubscribeEmail(req, res, next) {
  try {
    const email = normalizeEmail(req.query.email || req.body.email || "");
    const campaignId = String(
      req.query.campaign || req.body.campaign || ""
    ).trim();
    const reason = String(req.body.reason || "").trim().slice(0, 300);
    const unsubscribedAt = new Date();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required",
      });
    }

    await EmailUnsubscribe.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          reason,
          source: "campaign",
          unsubscribedAt,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    if (campaignId && isValidObjectId(campaignId)) {
      await EmailCampaignLog.updateMany(
        { campaign: campaignId, email },
        {
          $set: {
            status: "unsubscribed",
            unsubscribedAt,
          },
        }
      );

      await refreshCampaignUnsubscribeCount(campaignId);
    }

    const wantsHtml =
      String(req.headers.accept || "").includes("text/html") ||
      req.method === "GET";

    if (wantsHtml) {
      return res.status(200).send(renderUnsubscribeHtml(email));
    }

    return res.status(200).json({
      success: true,
      message: "You have been unsubscribed successfully",
    });
  } catch (error) {
    next(error);
  }
}