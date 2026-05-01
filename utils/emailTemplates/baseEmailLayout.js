// utils/emailTemplates/baseEmailLayout.js

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(value = "", maxLength = 220) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

export function baseEmailLayout({
  brandName = "KnockoutCodes",
  previewText = "",
  title = "",
  content = "",
  footerNote = "You are receiving this email because you subscribed to updates from us.",
}) {
  const safeBrandName = escapeHtml(brandName);
  const safePreviewText = escapeHtml(truncateText(previewText, 220));
  const safeTitle = escapeHtml(title || brandName || "Email Update");
  const safeFooterNote = escapeHtml(footerNote);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none!important;visibility:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;">
      ${safePreviewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background-color:#0a0a0a;margin:0;padding:0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;"
    >
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="max-width:680px;width:100%;background:#111111;border:1px solid #222222;border-radius:18px;overflow:hidden;border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;"
          >
            <tr>
              <td style="padding:28px 32px;background:#141414;border-bottom:1px solid #222222;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c9a227;font-weight:700;">
                  ${safeBrandName}
                </div>
                <div style="margin-top:10px;font-size:28px;line-height:1.3;font-weight:700;color:#ffffff;">
                  ${safeTitle}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 32px;">
                ${content}
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px;border-top:1px solid #222222;background:#0d0d0d;">
                <div style="font-size:13px;line-height:1.7;color:#bdbdbd;">
                  ${safeFooterNote}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}