export const COACHING_STORAGE_KEY = "kc_coaching_draft";

/**
 * We ONLY store non-sensitive draft fields.
 * We do NOT store: fullName, email, phone, nickName (PII / honeypot).
 */
const ALLOWED_DRAFT_KEYS = [
  "coachingType",
  "duration",
  "timeZone",
  "date",
  "time",
  "goals",
  "preferGoogleMeet",
  "acceptPolicies",
  "marketingOptIn",
];

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

function guessTimeZone() {
  try {
    return (
      (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "America/Los_Angeles"
    );
  } catch {
    return "America/Los_Angeles";
  }
}

function getDraft() {
  if (typeof window === "undefined") return {};
  return safeParseDraft(localStorage.getItem(COACHING_STORAGE_KEY));
}

/**
 * Factory so every reset gets a fresh clean object.
 */
export function createCoachingInitialForm() {
  const draft = getDraft();

  return {
    fullName: "",
    email: "",
    phone: "",

    // Boxing-only defaults
    coachingType: draft.coachingType || "Power Punch Mechanics",
    duration: String(draft.duration || "60"),
    timeZone: draft.timeZone || guessTimeZone(),

    date: draft.date || "",
    time: draft.time || "",

    goals: draft.goals || "",
    preferGoogleMeet:
      typeof draft.preferGoogleMeet === "boolean" ? draft.preferGoogleMeet : true,
    acceptPolicies:
      typeof draft.acceptPolicies === "boolean" ? draft.acceptPolicies : false,
    marketingOptIn:
      typeof draft.marketingOptIn === "boolean" ? draft.marketingOptIn : false,

    // Honeypot
    nickName: "",
  };
}

export function createCoachingInitialState() {
  return {
    form: createCoachingInitialForm(),
    status: { state: "idle", message: "" },
  };
}

export const coachingInitialState = createCoachingInitialState();