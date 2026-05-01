// ✅ LocalStorage key dedicated to Contact draft (safe-only)
export const CONTACT_STORAGE_KEY = "kc_contact_draft";

/**
 * ✅ SECURITY RULE:
 * We ONLY store non-sensitive draft fields.
 * We do NOT store: name, email, phone (PII).
 */
const ALLOWED_DRAFT_KEYS = ["subject", "message"];

// ✅ Safe JSON parse (prevents crashes from corrupted storage)
function safeParseDraft(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const cleaned = {};
    for (const k of ALLOWED_DRAFT_KEYS) {
      if (k in parsed) cleaned[k] = parsed[k];
    }
    return cleaned;
  } catch {
    return {};
  }
}

// ✅ Read draft only in browser (avoids SSR crashes)
const draft = safeParseDraft(
  typeof window !== "undefined"
    ? localStorage.getItem(CONTACT_STORAGE_KEY)
    : null
);

export const contactInitialState = {
  form: {
    // PII fields (never saved to localStorage)
    name: "",
    email: "",
    phone: "",

    // Safe draft fields (ok to save)
    subject: draft.subject || "",
    message: draft.message || "",

    /**
     * ✅ Honeypot field (bot trap)
     * Frontend will render it hidden later (Step 2).
     * If a bot fills it, backend already treats it as bot.
     */
    company: "",
  },

  // ✅ Same status shape as coaching (easy reuse)
  status: { state: "idle", message: "" },
};
