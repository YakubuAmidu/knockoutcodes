// src/reducers/contact/contactInitialState.js

export const CONTACT_STORAGE_KEY = "kc_contact_draft";

const ALLOWED_DRAFT_KEYS = ["subject", "message"];

function safeParseDraft(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed || typeof parsed !== "object") return {};

    const cleaned = {};

    for (const key of ALLOWED_DRAFT_KEYS) {
      if (key in parsed) {
        cleaned[key] = String(parsed[key] || "");
      }
    }

    return cleaned;
  } catch {
    return {};
  }
}

const draft = safeParseDraft(
  typeof window !== "undefined"
    ? localStorage.getItem(CONTACT_STORAGE_KEY)
    : null,
);

export const contactInitialState = {
  form: {
    name: "",
    email: "",
    phone: "",

    subject: draft.subject || "",
    message: draft.message || "",

    company: "",
  },

  status: {
    state: "idle",
    message: "",
  },
};
