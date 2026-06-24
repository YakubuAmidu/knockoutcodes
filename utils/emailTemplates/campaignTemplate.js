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
  previewText = "Premium boxing, training, coaching, and fighter development.",
  headline = "Train Smarter. Hit Harder. Move Like A Champion.",
  subheadline = "KnockoutCodes helps fighters, athletes, and beginners build real boxing skill with structured training, premium gear, coaching, and fight-ready education.",
  body = "Whether you are starting from zero or sharpening your next level, KnockoutCodes gives you the blueprint: boxing drills, power mechanics, footwork, conditioning, fight IQ, coaching, and premium training resources built for serious improvement.",
  ctaText = "Explore KnockoutCodes",
  ctaUrl = "#",
  signature = "Team KnockoutCodes",
  unsubscribeUrl = "",
}) {
  const safeBrandName = escapeHtml(brandName);
  const safePreviewText = escapeHtml(previewText);
  const safeHeadline = escapeHtml(headline);
  const safeSubheadline = escapeHtml(subheadline);
  const safeBody = formatBodyHtml(body);
  const safeCtaText = escapeHtml(ctaText || "Explore KnockoutCodes");
  const safeCtaUrl = sanitizeUrl(ctaUrl, "#");
  const safeSignature = escapeHtml(signature || "Team KnockoutCodes");
  const safeUnsubscribeUrl = sanitizeUrl(unsubscribeUrl, "");

  const unsubscribeBlock = safeUnsubscribeUrl
    ? `
      <div style="margin-top:34px;padding-top:22px;border-top:1px solid rgba(214,182,159,0.22);">
        <p style="margin:0;font-size:12px;line-height:1.75;color:#D6B69F;">
          You are receiving this because you joined ${safeBrandName}, subscribed, or purchased from our brand.
        </p>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.75;color:#FFF9F2;opacity:.76;">
          Don’t want these emails anymore?
          <a href="${safeUnsubscribeUrl}" style="color:#D6B69F;text-decoration:underline;font-weight:700;" target="_blank" rel="noopener noreferrer">
            Unsubscribe here
          </a>
        </p>
      </div>
    `
    : "";

  const content = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#FFF9F2;">
      <div style="text-align:center;margin-bottom:26px;">
        <div style="display:inline-block;padding:10px 16px;border-radius:999px;background:rgba(214,182,159,0.13);border:1px solid rgba(214,182,159,0.30);color:#D6B69F;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:900;">
          Premium Fighter Development
        </div>

        <h1 style="margin:22px 0 14px;font-size:40px;line-height:1.08;letter-spacing:-.035em;color:#FFFFFF;font-weight:900;">
          ${safeHeadline}
        </h1>

        <p style="margin:0 auto;font-size:18px;line-height:1.7;color:#D6B69F;font-weight:700;max-width:620px;">
          ${safeSubheadline}
        </p>
      </div>

      <div style="margin:0 0 28px;padding:24px;border-radius:24px;background:linear-gradient(135deg,rgba(214,182,159,0.13),rgba(47,27,18,0.78));border:1px solid rgba(214,182,159,0.24);box-shadow:0 20px 48px rgba(0,0,0,0.30);">
        <div style="font-size:16px;line-height:1.9;color:#FFF9F2;">
          ${safeBody}
        </div>
      </div>

      <div style="display:block;margin:0 0 28px;">
        <div style="padding:18px 20px;margin-bottom:12px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);">
          <h3 style="margin:0 0 8px;color:#D6B69F;font-size:16px;">What KnockoutCodes Helps You Build</h3>
          <p style="margin:0;color:#FFF9F2;line-height:1.75;font-size:14px;">
            Power punching mechanics, speed combinations, defense, slips, counters, footwork, conditioning, ring IQ, and disciplined fighter habits.
          </p>
        </div>

        <div style="padding:18px 20px;margin-bottom:12px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);">
          <h3 style="margin:0 0 8px;color:#D6B69F;font-size:16px;">Built For Every Serious Level</h3>
          <p style="margin:0;color:#FFF9F2;line-height:1.75;font-size:14px;">
            From beginner foundations to advanced performance and elite fight-camp preparation, the goal is simple: train with structure and improve with purpose.
          </p>
        </div>

        <div style="padding:18px 20px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);">
          <h3 style="margin:0 0 8px;color:#D6B69F;font-size:16px;">Courses • Coaching • Gear</h3>
          <p style="margin:0;color:#FFF9F2;line-height:1.75;font-size:14px;">
            Explore premium training programs, coaching sessions, boxing products, and resources designed to help you move sharper and train harder.
          </p>
        </div>
      </div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:34px auto;border-collapse:separate;">
        <tr>
          <td align="center" bgcolor="#D6B69F" style="border-radius:999px;box-shadow:0 18px 44px rgba(0,0,0,0.34);">
            <a href="${safeCtaUrl}" style="display:inline-block;padding:16px 34px;font-size:14px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:999px;" target="_blank" rel="noopener noreferrer">
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
