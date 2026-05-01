// routes/emailCampaignPreviewRoutes.js
import express from "express";
import { renderCampaignEmail } from "../utils/emailTemplates/renderEmailTemplate.js";
import { sendMail } from "../utils/mailer.js";

const router = express.Router();

router.get("/preview", (req, res) => {
  const { html } = renderCampaignEmail({
    brandName: "KnockoutCodes",
    previewText: "Luxury premium email preview",
    headline: "Train Sharp. Look Sharp. Move Like A Champion.",
    subheadline:
      "A 5-star premium email design that feels elite, clean, and powerful.",
    body:
      "This is a preview of your campaign email system.\n\nUse this structure for launches, product drops, coaching offers, newsletters, and premium brand announcements.",
    ctaText: "Explore Now",
    ctaUrl: "https://aurora45.gumroad.com",
    signature: "Yakubu | KnockoutCodes",
  });

  res.status(200).send(html);
});

router.post("/send-test", async (req, res, next) => {
  try {
    const { to } = req.body;

    if (!to || typeof to !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid recipient email is required",
      });
    }

    const payload = renderCampaignEmail({
      brandName: "KnockoutCodes",
      previewText: "Luxury premium test email",
      headline: "Your Premium Email System Is Working",
      subheadline:
        "Clean design. Strong brand presence. Ready for higher conversions.",
      body:
        "This is your first luxury campaign test email.\n\nNext, we will build the real campaign database, admin campaign creation flow, audience targeting, and sending logic.",
      ctaText: "Visit Store",
      ctaUrl: "https://aurora45.gumroad.com",
      signature: "Yakubu | KnockoutCodes",
    });

    const result = await sendMail({
      to,
      subject: "Your Premium Email System Is Working",
      html: payload.html,
      text: payload.text,
    });

    return res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;