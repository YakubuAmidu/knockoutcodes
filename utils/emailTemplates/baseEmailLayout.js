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

  <body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none!important;visibility:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;">
      ${safePreviewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;width:100%;background:#000000;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:44px 14px;background:#000000;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;width:100%;border-collapse:separate;background:#2F1B12;border:1px solid rgba(255,255,255,0.10);border-radius:28px;overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,0.28);">
            
            <tr>
              <td style="padding:0;background:#000000;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:34px 34px 30px;background:linear-gradient(135deg,#2F1B12,#3D261A);border-bottom:1px solid rgba(214,182,159,0.24);">
                      
                      <div style="display:inline-block;padding:9px 13px;border-radius:999px;background:rgba(214,182,159,0.14);border:1px solid rgba(214,182,159,0.28);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#D6B69F;font-weight:900;">
                        ${safeBrandName}
                      </div>

                      <h1 style="margin:18px 0 0;font-size:32px;line-height:1.12;letter-spacing:-.035em;color:#FFFFFF;font-weight:900;">
                        ${safeTitle}
                      </h1>

                      <div style="margin-top:18px;width:72px;height:3px;background:#D6B69F;border-radius:999px;box-shadow:0 0 18px rgba(214,182,159,0.5);"></div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:34px;background:#000000;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(61,38,26,0.68));border:1px solid rgba(255,255,255,0.10);border-radius:22px;">
                        <tr>
                          <td style="padding:28px;">
                            ${content}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:26px 34px;background:#2F1B12;border-top:1px solid rgba(214,182,159,0.20);">
                      <div style="font-size:12px;line-height:1.75;color:#D6B69F;">
                        ${safeFooterNote}
                      </div>

                      <div style="margin-top:14px;font-size:11px;line-height:1.7;color:#FFF9F2;opacity:.62;">
                        © ${new Date().getFullYear()} ${safeBrandName}. Built with discipline, precision, and premium standards.
                      </div>
                    </td>
                  </tr>

                </table>
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