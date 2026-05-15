// middleware/antiBotMiddleware.js

function hasTooManyLinks(text = "") {
  const links = String(text).match(/https?:\/\/|www\./gi);
  return (links?.length || 0) >= 2;
}

function hasRepeatSpam(text = "") {
  return /([a-zA-Z0-9!?.])\1{9,}/.test(String(text || ""));
}

function looksEmptyOrJunk(text = "", min = 3) {
  const t = String(text || "").trim();
  if (t.length < min) return true;

  const alphaNum = (t.match(/[a-zA-Z0-9]/g) || []).length;
  return alphaNum < Math.min(3, Math.floor(t.length * 0.15));
}

export function antiBot({
  honeypotFields = ["website", "nickName"],
  textFields = ["message", "goals"],
  nameFields = ["name", "fullName"],
} = {}) {
  return function antiBotMiddleware(req, res, next) {
    try {
      for (const field of honeypotFields) {
        const hp = req.body?.[field];
        if (typeof hp === "string" && hp.trim().length > 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid request.",
          });
        }
      }

      for (const field of textFields) {
        const value = req.body?.[field];

        if (value !== undefined) {
          if (looksEmptyOrJunk(value, field === "goals" ? 20 : 3)) {
            return res.status(400).json({
              success: false,
              message: "Message is required and must be meaningful.",
            });
          }

          if (hasTooManyLinks(value) || hasRepeatSpam(value)) {
            return res.status(400).json({
              success: false,
              message: "Message looks like spam. Please rewrite and try again.",
            });
          }
        }
      }

      for (const field of nameFields) {
        const value = req.body?.[field];

        if (typeof value === "string" && value.trim()) {
          if (hasRepeatSpam(value) || hasTooManyLinks(value)) {
            return res.status(400).json({
              success: false,
              message: "Name looks invalid. Please rewrite and try again.",
            });
          }
        }
      }

      next();
    } catch {
      next();
    }
  };
}