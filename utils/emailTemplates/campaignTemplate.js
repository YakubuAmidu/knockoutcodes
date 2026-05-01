// utils/emailTemplates/campaignTemplate.js
import { baseEmailLayout } from "./baseEmailLayout.js";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(value = "", fallback = "#") {
  const clean = String(value || "").trim();

  if (!clean) return fallback;

  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("tel:") ||
    clean.startsWith("/")
  ) {
    return clean;
  }

  return fallback;
}

function formatBodyHtml(value = "") {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br />");
}

export function campaignTemplate({
  brandName = "KnockoutCodes",
  previewText = "Premium update from our brand.",
  headline = "A Premium Offer Built For Winners",
  subheadline = "Luxury presentation. Clear message. Strong conversion.",
  body = "This is your campaign message.",
  ctaText = "Shop Now",
  ctaUrl = "#",
  signature = "Team KnockoutCodes",
  unsubscribeUrl = "",
}) {
  const safeBrandName = escapeHtml(brandName);
  const safePreviewText = escapeHtml(previewText);
  const safeHeadline = escapeHtml(headline);
  const safeSubheadline = escapeHtml(subheadline);
  const safeBody = formatBodyHtml(body);
  const safeCtaText = escapeHtml(ctaText);
  const safeCtaUrl = sanitizeUrl(ctaUrl, "#");
  const safeSignature = escapeHtml(signature);
  const safeUnsubscribeUrl = sanitizeUrl(unsubscribeUrl, "");

  const unsubscribeBlock = safeUnsubscribeUrl
    ? `
      <p style="margin:30px 0 0;font-size:12px;line-height:1.7;color:#9b9b9b;">
        Don’t want these emails anymore?
        <a
          href="${safeUnsubscribeUrl}"
          style="color:#c9a227;text-decoration:underline;"
          target="_blank"
          rel="noopener noreferrer"
        >
          Unsubscribe here
        </a>
      </p>
    `
    : "";

  const content = `
    <div style="font-size:16px;line-height:1.8;color:#f5f5f5;">
      <p style="margin:0 0 18px;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#c9a227;font-weight:700;">
        Exclusive Release
      </p>

      <h1 style="margin:0 0 14px;font-size:34px;line-height:1.25;color:#ffffff;">
        ${safeHeadline}
      </h1>

      <p style="margin:0 0 24px;font-size:18px;line-height:1.7;color:#d6d6d6;">
        ${safeSubheadline}
      </p>

      <div style="margin:0 0 28px;font-size:16px;line-height:1.9;color:#eaeaea;">
        ${safeBody}
      </div>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="margin:28px 0;border-collapse:separate;"
      >
        <tr>
          <td align="center" bgcolor="#c9a227" style="border-radius:999px;">
            <a
              href="${safeCtaUrl}"
              style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:999px;"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${safeCtaText}
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:30px 0 0;font-size:15px;line-height:1.8;color:#cccccc;">
        ${safeSignature}
      </p>

      ${unsubscribeBlock}
    </div>
  `;

  return baseEmailLayout({
    brandName: safeBrandName,
    previewText: safePreviewText,
    title: safeHeadline,
    content,
    footerNote:
      "You are receiving this premium update because you joined our list or purchased from our brand.",
  });
}