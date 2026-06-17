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
    (clean.startsWith("/") && !clean.startsWith("//"))
  ) {
    return clean;
  }

  return fallback;
}

function formatBodyHtml(value = "") {
  return escapeHtml(value)
    .replace(/\r\n|\r|\n/g, "<br />")
    .replace(/<br \/><br \/>/g, "<br /><br />");
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
      <div style="margin-top:34px;padding-top:22px;border-top:1px solid rgba(214,182,159,0.22);">
        <p style="margin:0;font-size:12px;line-height:1.75;color:#D6B69F;">
          You are receiving this because you joined ${safeBrandName} or purchased from our brand.
        </p>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.75;color:#FFF9F2;opacity:.76;">
          Don’t want these emails anymore?
          <a
            href="${safeUnsubscribeUrl}"
            style="color:#D6B69F;text-decoration:underline;font-weight:700;"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsubscribe here
          </a>
        </p>
      </div>
    `
    : "";

  const content = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#FFF9F2;">
      <div style="margin:0 0 22px;padding:10px 14px;display:inline-block;border-radius:999px;background:rgba(214,182,159,0.13);border:1px solid rgba(214,182,159,0.28);color:#D6B69F;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:900;">
        Private Premium Release
      </div>

      <h1 style="margin:0 0 16px;font-size:38px;line-height:1.08;letter-spacing:-.035em;color:#FFFFFF;font-weight:900;">
        ${safeHeadline}
      </h1>

      <p style="margin:0 0 26px;font-size:18px;line-height:1.75;color:#D6B69F;font-weight:600;">
        ${safeSubheadline}
      </p>

      <div style="margin:0 0 30px;padding:22px;border-radius:22px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);box-shadow:0 18px 44px rgba(0,0,0,0.28);">
        <div style="font-size:16px;line-height:1.9;color:#FFF9F2;">
          ${safeBody}
        </div>
      </div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;border-collapse:separate;">
        <tr>
          <td align="center" bgcolor="#D6B69F" style="border-radius:999px;box-shadow:0 18px 44px rgba(0,0,0,0.28);">
            <a
              href="${safeCtaUrl}"
              style="display:inline-block;padding:15px 32px;font-size:14px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:999px;"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${safeCtaText}
            </a>
          </td>
        </tr>
      </table>

      <div style="margin-top:30px;padding:18px 20px;border-radius:18px;background:#2F1B12;border:1px solid rgba(214,182,159,0.20);">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#FFF9F2;">
          Respectfully,<br />
          <strong style="color:#D6B69F;">${safeSignature}</strong>
        </p>
      </div>

      ${unsubscribeBlock}
    </div>
  `;

  return baseEmailLayout({
    brandName: safeBrandName,
    previewText: safePreviewText,
    title: safeHeadline,
    content,
    footerNote: "Discipline creates champions. Precision creates legends.",
  });
}
