// src/pages/Coaching.jsx
import { useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { getCsrfToken } from "../../utils/csrf";

// ✅ redux hooks
import { useDispatch, useSelector } from "react-redux";
import { COACHING_ACTIONS } from "../reducers/coaching/coachingActionTypes";

/**
 * KnockoutCodes — Elite 1-on-1 BOXING Coaching (Backend-Ready, Clean)
 * - Saves requests to /api/v1/coachings
 * - Strong validation + deterministic error handling
 * - Bot hardening (headers + honeypot)
 * - Toast only (no inline message at bottom of form)
 * - Clears form on success
 */

// ✅ env base URL (empty means same origin)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// ✅ Admin email via env (safe fallback)
const ADMIN_EMAIL =
  import.meta.env.VITE_BOOKING_ADMIN_EMAIL || "coaching@yourdomain.com";

const COACHING_ENDPOINT = "/coachings";

const CAL_URL =
  "https://cal.com/knockoutcodes/1-on-1-coaching-session?overlayCalendar=true";

// ✅ Coaching types (single source of truth)
const COACHING_TYPES = [
  "Power Punch Mechanics",
  "Speed + Combination Flow",
  "Defense, Slips + Counters",
  "Footwork, Angles + Ring IQ",
  "Body Shots + Inside Fighting",
  "Southpaw vs Orthodox Strategy",
  "Bagwork Drill Plan (No Gym)",
  "Conditioning + Fight Pace",
];

const DEFAULT_COACHING_TYPE = COACHING_TYPES[0];

// ✅ length rules (tight + consistent)
const LIMITS = {
  fullName: { min: 2, max: 80 },
  email: { min: 6, max: 120 },
  phone: { min: 7, max: 25 }, // ✅ phone length min/max = 10 (US digits)
  coachingType: { min: 3, max: 80 },
  timeZone: { min: 3, max: 60 },
  goals: { min: 20, max: 1200 },
};

// --------- helpers ---------
function toISOFromLocalDateTime(dateStr, timeStr, timeZone) {
  try {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));

    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = fmt
      .formatToParts(dt)
      .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
    const localISO = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
    const guess = new Date(localISO);
    const utcISO = new Date(
      guess.getTime() - guess.getTimezoneOffset() * 60 * 1000
    ).toISOString();
    return utcISO;
  } catch {
    return null;
  }
}

function clampLen(str, max) {
  const s = String(str || "");
  return s.length > max ? s.slice(0, max) : s;
}

function stripAngleBrackets(str) {
  return String(str || "").replace(/[<>]/g, "");
}

function normalizeSpaces(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function isEmailLike(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || "").trim());
}

function onlyDigitsPlus(str) {
  return String(str || "").replace(/[^\d+]/g, "");
}

function normalizeCoachingType(value) {
  const v = normalizeSpaces(stripAngleBrackets(value));
  return COACHING_TYPES.includes(v) ? v : DEFAULT_COACHING_TYPE;
}

function validateLen(label, value, min, max) {
  const s = String(value || "");
  if (s.length < min) return `${label} must be at least ${min} characters.`;
  if (s.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export default function Coaching() {
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const form = useSelector((s) => s.coaching?.form);
  const status = useSelector((s) => s.coaching?.status);

  // ✅ safe fallback so UI never crashes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeForm = form || {
    fullName: "",
    email: "",
    phone: "",
    coachingType: DEFAULT_COACHING_TYPE,
    duration: "60",
    timeZone: "America/Los_Angeles",
    date: "",
    time: "",
    goals: "",
    preferGoogleMeet: true,
    acceptPolicies: false,
    marketingOptIn: false,
    nickName: "",
  };

  const selectedCoachingType = useMemo(
    () => normalizeCoachingType(safeForm.coachingType),
    [safeForm.coachingType]
  );

  const emailSubject = useMemo(
    () => `KnockoutCodes Boxing Coaching — ${safeForm.fullName || "(no name)"}`,
    [safeForm.fullName]
  );

  const emailSummary = useMemo(
    () =>
      [
        `Name: ${safeForm.fullName}`,
        `Email: ${safeForm.email}`,
        `Phone: ${safeForm.phone || "—"}`,
        `Coaching Type: ${selectedCoachingType}`,
        `Duration: ${safeForm.duration} mins`,
        `Time Zone: ${safeForm.timeZone}`,
        `Preferred: ${safeForm.date || "—"} at ${safeForm.time || "—"}`,
        `Google Meet: ${safeForm.preferGoogleMeet ? "Yes" : "No"}`,
        `Marketing Opt-In: ${safeForm.marketingOptIn ? "Yes" : "No"}`,
        `Goals: ${safeForm.goals || "—"}`,
      ].join("\n"),
    [safeForm, selectedCoachingType]
  );

  function setField(name, value) {
    dispatch({
      type: COACHING_ACTIONS.UPDATE_FIELD,
      payload: { name, value },
    });
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;

    if (name === "coachingType") {
      setField(name, normalizeCoachingType(value));
      return;
    }

    // ✅ auto-normalize phone as digits only (keeps UX clean + matches backend)
   if (name === "phone") {
  setField(name, onlyDigitsPlus(value).slice(0, LIMITS.phone.max));
  return;
}

    setField(name, type === "checkbox" ? checked : value);
  }

  function setStatus(next) {
    dispatch({ type: COACHING_ACTIONS.SET_STATUS, payload: next });
  }

  function validate() {
    if (safeForm.nickName) return { ok: false, msg: "Bot detected." };

    const fullName = clampLen(
      normalizeSpaces(stripAngleBrackets(safeForm.fullName)),
      LIMITS.fullName.max
    );
    const email = clampLen(
      normalizeSpaces(stripAngleBrackets(safeForm.email)).toLowerCase(),
      LIMITS.email.max
    );

   const phone = onlyDigitsPlus(
  clampLen(normalizeSpaces(stripAngleBrackets(safeForm.phone)), 40)
).slice(0, LIMITS.phone.max);

    const goals = clampLen(
      normalizeSpaces(stripAngleBrackets(safeForm.goals)),
      LIMITS.goals.max
    );

    const coachingType = normalizeCoachingType(safeForm.coachingType);

    const timeZone = clampLen(
      normalizeSpaces(stripAngleBrackets(safeForm.timeZone)),
      LIMITS.timeZone.max
    );

    if (!fullName) return { ok: false, msg: "Please enter your full name." };
    const nameLenErr = validateLen(
      "Full name",
      fullName,
      LIMITS.fullName.min,
      LIMITS.fullName.max
    );
    if (nameLenErr) return { ok: false, msg: nameLenErr };

    if (!email) return { ok: false, msg: "Email is required." };
    const emailLenErr = validateLen(
      "Email",
      email,
      LIMITS.email.min,
      LIMITS.email.max
    );
    if (emailLenErr) return { ok: false, msg: emailLenErr };
    if (!isEmailLike(email)) return { ok: false, msg: "Enter a valid email." };

    if (!phone) return { ok: false, msg: "Phone number is required." };
    const phoneLenErr = validateLen(
      "Phone number",
      phone,
      LIMITS.phone.min,
      LIMITS.phone.max
    );
    if (phoneLenErr) return { ok: false, msg: phoneLenErr };

    if (!coachingType)
      return { ok: false, msg: "Please choose a coaching type." };
    if (!COACHING_TYPES.includes(coachingType))
      return { ok: false, msg: "Invalid coaching type selected." };

    if (!safeForm.duration) return { ok: false, msg: "Duration is required." };

    if (!timeZone) return { ok: false, msg: "Time zone is required." };
    const tzLenErr = validateLen(
      "Time zone",
      timeZone,
      LIMITS.timeZone.min,
      LIMITS.timeZone.max
    );
    if (tzLenErr) return { ok: false, msg: tzLenErr };

    if (!safeForm.date) return { ok: false, msg: "Pick a preferred date." };
    if (!safeForm.time) return { ok: false, msg: "Pick a preferred time." };

    if (!goals)
      return {
        ok: false,
        msg: "Please write what you want from this session (your goals).",
      };
    const goalsLenErr = validateLen(
      "Message",
      goals,
      LIMITS.goals.min,
      LIMITS.goals.max
    );
    if (goalsLenErr) return { ok: false, msg: goalsLenErr };

    if (!safeForm.acceptPolicies)
      return { ok: false, msg: "Please accept the coaching policies." };

    return {
      ok: true,
      cleaned: { fullName, email, phone, goals, coachingType, timeZone },
    };
  }

  async function onSubmit(e) {
    e.preventDefault();

    const v = validate();
    if (!v.ok) {
      setStatus({ state: "error", message: v.msg });
      if (typeof showToast === "function") showToast(v.msg, "error");
      return;
    }

    setStatus({ state: "loading", message: "Submitting your boxing request…" });

    const preferredStartISO = toISOFromLocalDateTime(
      safeForm.date,
      safeForm.time,
      v.cleaned.timeZone
    );

    const payload = {
      fullName: v.cleaned.fullName,
      email: v.cleaned.email,
      phone: v.cleaned.phone,
      coachingType: v.cleaned.coachingType,
      duration: Number(safeForm.duration),
      timeZone: v.cleaned.timeZone,
      preferredDate: safeForm.date,
      preferredTime: safeForm.time,
      preferredStartISO,
      preferGoogleMeet: !!safeForm.preferGoogleMeet,
      goals: v.cleaned.goals,
      marketingOptIn: !!safeForm.marketingOptIn,
      emailSubject,
      emailSummary,
      source: {
        channel: "web",
        pageUrl: typeof window !== "undefined" ? window.location.href : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE_URL}${COACHING_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
      "X-Form-TS": String(Date.now()),
      "X-Honey": "",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
    credentials: "include",
    signal: controller.signal,
  });

  let data = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    setStatus({ state: "error", message: msg });
    if (typeof showToast === "function") showToast(msg, "error");
    return;
  }

  const successMsg =
    data?.message || "Request received! We’ll email you shortly.";

  setStatus({ state: "success", message: successMsg });
  if (typeof showToast === "function") showToast(successMsg, "success");

  dispatch({ type: COACHING_ACTIONS.RESET_AFTER_SUCCESS });
} catch (err) {
  if (err?.name === "AbortError") {
    const msg = "Request timed out. Please try again (or book via Cal.com).";
    setStatus({ state: "warning", message: msg });
    if (typeof showToast === "function") showToast(msg, "warning");
    return;
  }

  const fallbackMsg =
  "Network issue. Your request was not sent. Please try again or use Cal.com.";

setStatus({ state: "warning", message: fallbackMsg });
if (typeof showToast === "function") showToast(fallbackMsg, "warning");

  setStatus({ state: "warning", message: fallbackMsg });
  if (typeof showToast === "function") showToast(fallbackMsg, "warning");
} finally {
  clearTimeout(timeout);
}
  }

  return (
    <Page initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Hero>
        <Badge as={motion.div} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          SHARPEN YOUR HANDS FAST
        </Badge>

        <Title as={motion.h1} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          KnockoutCodes — Elite 1-on-1 Boxing Coaching
        </Title>

        <Sub>
          Cleaner technique. Faster combos. Better defense. Real fight IQ. Leave
          this session with a drill plan you can run every day — built for your
          style.
        </Sub>

        {CAL_URL && (
          <CalBar>
            <a href={CAL_URL} target="_blank" rel="noreferrer" className="cal-btn">
              Book instantly via Cal.com
            </a>
            <span className="or">or</span>
            <a className="form-btn" href="#book-form">
              Use the form below
            </a>
          </CalBar>
        )}
      </Hero>

      <Shell>
        <Card
          as={motion.div}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 120, damping: 18 }}
        >
          <CardTitle>Request Your Boxing Session</CardTitle>

          <Form id="book-form" onSubmit={onSubmit} noValidate>
            <Row>
              <Field>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={safeForm.fullName}
                  onChange={onChange}
                  placeholder="Your full name"
                  required
                  minLength={LIMITS.fullName.min}
                  maxLength={LIMITS.fullName.max}
                  autoComplete="name"
                />
              </Field>

              <Field>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={safeForm.email}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                  minLength={LIMITS.email.min}
                  maxLength={LIMITS.email.max}
                  autoComplete="email"
                />
              </Field>
            </Row>

            <Row>
              <Field>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={safeForm.phone}
                  onChange={onChange}
                  placeholder="Enter your phone number..."
                  required
                  minLength={LIMITS.phone.min}
                  maxLength={LIMITS.phone.max}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>

              <Field>
                <Label htmlFor="coachingType">Coaching type</Label>
                <Select
                  id="coachingType"
                  name="coachingType"
                  value={selectedCoachingType}
                  onChange={onChange}
                  required
                >
                  {COACHING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </Row>

            <Row>
              <Field>
                <Label htmlFor="duration">Duration</Label>
                <Select
                  id="duration"
                  name="duration"
                  value={safeForm.duration}
                  onChange={onChange}
                  required
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="timeZone">Time zone</Label>
                <Input
                  id="timeZone"
                  name="timeZone"
                  value={safeForm.timeZone}
                  onChange={onChange}
                  required
                  minLength={LIMITS.timeZone.min}
                  maxLength={LIMITS.timeZone.max}
                />
              </Field>
            </Row>

            <Row>
              <Field>
                <Label htmlFor="date">Preferred date</Label>
                <Input id="date" type="date" name="date" value={safeForm.date} onChange={onChange} required />
              </Field>

              <Field>
                <Label htmlFor="time">Preferred time</Label>
                <Input id="time" type="time" name="time" value={safeForm.time} onChange={onChange} required />
              </Field>
            </Row>

            <Row $columns="1">
              <Field>
                <Label htmlFor="goals">What do you want from this boxing session?</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  value={safeForm.goals}
                  onChange={onChange}
                  rows={5}
                  required
                  minLength={LIMITS.goals.min}
                  maxLength={LIMITS.goals.max}
                  placeholder="Tell me your level, stance (orthodox/southpaw), what you struggle with (power, speed, defense, gas tank), and what you want to fix first…"
                />
              </Field>
            </Row>

            {/* Honeypot (hidden) */}
            <div style={{ position: "absolute", left: -9999, opacity: 0 }} aria-hidden={true}>
              <label htmlFor="nickName">Nickname</label>
              <input id="nickName" name="nickName" value={safeForm.nickName} onChange={onChange} />
            </div>

            <Row $columns="1">
              <Checks>
                <label className="check">
                  <input
                    type="checkbox"
                    name="preferGoogleMeet"
                    checked={!!safeForm.preferGoogleMeet}
                    onChange={onChange}
                  />
                  <span>Use Google Meet (default)</span>
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    checked={!!safeForm.marketingOptIn}
                    onChange={onChange}
                  />
                  <span>
                    Send me occasional discounts & KnockoutCodes updates (I can unsubscribe anytime)
                  </span>
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    name="acceptPolicies"
                    checked={!!safeForm.acceptPolicies}
                    onChange={onChange}
                  />
                  <span>
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noreferrer">
                      booking policies
                    </a>
                    .
                  </span>
                </label>
              </Checks>
            </Row>

            <Actions>
              <Primary type="submit" disabled={status?.state === "loading"}>
                {status?.state === "loading" ? "Submitting…" : "Request 1-on-1 Boxing Coaching"}
              </Primary>

              {CAL_URL && (
                <Ghost href={CAL_URL} target="_blank" rel="noreferrer">
                  Book via Cal.com
                </Ghost>
              )}
            </Actions>
          </Form>
        </Card>

        <PolicyCard
          as={motion.div}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 120, damping: 18 }}
        >
          <PolicyTitle>Read this before you book</PolicyTitle>

          <HooksList>
            <li>
              <strong>1–3s HOOK:</strong> Fix one mistake… and your punches feel illegal.
            </li>
            <li>
              <strong>Hit harder:</strong> We sharpen your mechanics so every shot lands clean — no wasted motion.
            </li>
            <li>
              <strong>Fight IQ:</strong> Learn what to throw, when to throw it, and why it works.
            </li>
            <li>
              <strong>Real plan:</strong> Leave with a drill schedule you can run daily (even no gym).
            </li>
            <li>
              <strong>Fast feedback:</strong> Live corrections — stance, balance, timing, distance, defense.
            </li>
          </HooksList>

          <small>
            Book via Cal.com for instant scheduling, or request here and we confirm within 24 hours.
          </small>
        </PolicyCard>
      </Shell>
    </Page>
  );
}

// =========================
// styled
// =========================
const Page = styled(motion.main)`
  --bg: ${({ theme }) => theme.colors.darkBrown};
  --card: ${({ theme }) => theme.colors.brown};
  --ink: ${({ theme }) => theme.colors.ivory};
  --accent: ${({ theme }) => theme.colors.lightBrown};
  --glass: ${({ theme }) => theme.colors.glass};
  --shadow: ${({ theme }) => theme.shadow.glow};

  min-height: 100svh;
  background:
    radial-gradient(1200px 600px at 10% 0%, rgba(214, 182, 159, 0.12), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(214, 182, 159, 0.12), transparent 60%),
    var(--bg);
  color: var(--ink);
`;

const Hero = styled.header`
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: 72px 20px 28px;
  text-align: center;
`;

const Badge = styled.div`
  display: inline-block;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 12px;
`;

const Title = styled.h1`
  margin: 18px auto 8px;
  font-size: clamp(38px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 0 rgba(0,0,0,0.2);
`;

const Sub = styled.p`
  opacity: 0.9;
  max-width: 780px;
  margin: 0 auto;
  font-size: clamp(16px, 1.8vw, 18px);
`;

const CalBar = styled.div`
  margin-top: 20px;
  display: inline-flex;
  gap: 12px;
  align-items: center;

  .cal-btn, .form-btn {
    padding: 12px 16px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.lightBrown};
    color: ${({ theme }) => theme.colors.black};
    font-weight: 700;
    border: none;
    cursor: pointer;
    text-decoration: none;
  }

  .form-btn {
    background: transparent;
    color: ${({ theme }) => theme.colors.white};
    border: 1px solid rgba(255,255,255,0.2);
  }

  .or {
    opacity: 0.7;
    font-size: 14px;
  }
`;

const Shell = styled.section`
  max-width: ${({ theme }) => theme.layout.max};
  margin: 12px auto 80px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;

  @media (min-width: 980px) {
    grid-template-columns: 1.2fr 0.8fr;
  }
`;

const Card = styled.div`
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.0) 22%), var(--card);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: var(--shadow);
  padding: 24px;
`;

const CardTitle = styled.h2`
  font-size: 22px;
  margin: 4px 0 18px;
`;

const Form = styled.form`
  display: grid;
  gap: 16px;
`;

const Row = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "columns" && prop !== "$columns",
})`
  display: grid;
  grid-template-columns: ${({ $columns, columns }) =>
    $columns === "1" || columns === "1" ? "1fr" : "1fr 1fr"};
  gap: 14px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  opacity: 0.9;
`;

const inputBase = `
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 14px;
  color: #fff;
  padding: 12px 14px;
  outline: none;
  transition: 180ms ease;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.2);
  &:focus {
    border-color: rgba(255,255,255,0.45);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.16);
  }
`;

const Input = styled.input`${inputBase}`;
const Select = styled.select`${inputBase}`;
const Textarea = styled.textarea`${inputBase}`;

const Checks = styled.div`
  display: grid;
  gap: 10px;

  .check {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    user-select: none;

    input[type="checkbox"] {
      transform: translateY(1px);
      accent-color: ${({ theme }) => theme.colors.lightBrown};
    }

    a {
      color: ${({ theme }) => theme.colors.lightBrown};
    }
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Primary = styled.button`
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-weight: 800;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(214,182,159,0.25);
  transition: 200ms ease;

  &:hover { transform: translateY(-1px) scale(1.01); }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Ghost = styled.a`
  background: transparent;
  color: #fff;
  font-weight: 700;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: 200ms ease;
  text-decoration: none;

  &:hover { background: rgba(255,255,255,0.06); }
`;

const PolicyCard = styled(Card)`
  small {
    display: block;
    opacity: 0.75;
    margin-top: 12px;
    line-height: 1.6;
  }
`;

const PolicyTitle = styled.h3`
  margin: 2px 0 12px;
`;

const HooksList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  line-height: 1.55;

  strong { color: ${({ theme }) => theme.colors.lightBrown}; }
`;
