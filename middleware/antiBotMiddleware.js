// middleware/antiBotMiddleware.js

/**
 * Simple anti-bot defenses:
 * 1) Honeypot field (bots often fill hidden inputs)
 * 2) Blocks obvious link-spam / junk payloads
 * 3) Basic length + repeating-character checks
 *
 * Safe: does NOT touch req.file, and does NOT require any frontend changes.
 * (If you later add a hidden field in the frontend, set the same name below.)
 */

function hasTooManyLinks(text = "") {
  const t = String(text);
  const links = t.match(/https?:\/\/|www\./gi);
  return (links?.length || 0) >= 2; // allow 0-1 link, block 2+
}

function hasRepeatSpam(text = "") {
  const t = String(text);
  // e.g., "!!!!!!!!!!!!" or "aaaaaaa"
  return /([a-zA-Z0-9!?.])\1{9,}/.test(t); // 10+ repeats
}

function looksEmptyOrJunk(text = "") {
  const t = String(text).trim();
  if (t.length < 3) return true;
  // mostly symbols (very low signal)
  const alphaNum = (t.match(/[a-zA-Z0-9]/g) || []).length;
  return alphaNum < Math.min(3, Math.floor(t.length * 0.15));
}

export function antiBot({ honeypotField = "website" } = {}) {
  return function antiBotMiddleware(req, res, next) {
    try {
      // Honeypot: if present and filled, treat as bot
      const hp = req.body?.[honeypotField];
      if (typeof hp === "string" && hp.trim().length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid request.",
        });
      }

      // Check common text fields (safe defaults)
      const message = req.body?.message ?? "";
      const name = req.body?.name ?? "";

      if (looksEmptyOrJunk(message)) {
        return res.status(400).json({
          success: false,
          message: "Message is required (min 3 chars).",
        });
      }

      if (hasTooManyLinks(message) || hasRepeatSpam(message)) {
        return res.status(400).json({
          success: false,
          message: "Message looks like spam. Please rewrite and try again.",
        });
      }

      // Name spam check (optional, light)
      if (typeof name === "string" && name.trim().length > 0) {
        if (hasRepeatSpam(name) || hasTooManyLinks(name)) {
          return res.status(400).json({
            success: false,
            message: "Name looks invalid. Please rewrite and try again.",
          });
        }
      }

      next();
    } catch {
      // Never crash the route because of anti-bot logic
      next();
    }
  };
}
