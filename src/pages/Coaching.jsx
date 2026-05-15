// src/pages/Coaching.jsx
import { useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "../components/Toast";
import { getCsrfToken } from "../../utils/csrf";
import { COACHING_ACTIONS } from "../reducers/coaching/coachingActionTypes";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const COACHING_ENDPOINT = "/coachings";

const CAL_URL =
  "https://cal.com/knockoutcodes/1-on-1-coaching-session?overlayCalendar=true";

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

const LIMITS = {
  fullName: { min: 2, max: 80 },
  email: { min: 6, max: 120 },
  phone: { min: 7, max: 25 },
  coachingType: { min: 3, max: 80 },
  timeZone: { min: 3, max: 60 },
  goals: { min: 20, max: 1200 },
};

function getTodayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateYYYYMMDD(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidTimeHHMM(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function toISOFromLocalDateTime(dateStr, timeStr, timeZone) {
  try {
    if (!dateStr || !timeStr || !timeZone) return null;
    if (!isValidDateYYYYMMDD(dateStr) || !isValidTimeHHMM(timeStr)) return null;
    if (!isValidTimeZone(timeZone)) return null;

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);

    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    return utcDate.toISOString();
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

function hasSpamPattern(str) {
  const value = String(str || "");
  const links = value.match(/https?:\/\/|www\./gi);
  const hasTooManyLinks = (links?.length || 0) >= 2;
  const hasRepeatingChars = /([a-zA-Z0-9!?.])\1{9,}/.test(value);

  return hasTooManyLinks || hasRepeatingChars;
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

  const today = useMemo(() => getTodayYYYYMMDD(), []);

  const selectedCoachingType = useMemo(
    () => normalizeCoachingType(safeForm.coachingType),
    [safeForm.coachingType]
  );

  const emailSubject = useMemo(
    () =>
      `KnockoutCodes Boxing Coaching — ${
        normalizeSpaces(stripAngleBrackets(safeForm.fullName)) || "(no name)"
      }`,
    [safeForm.fullName]
  );

  const emailSummary = useMemo(
    () =>
      [
        `Name: ${normalizeSpaces(stripAngleBrackets(safeForm.fullName))}`,
        `Email: ${normalizeSpaces(stripAngleBrackets(safeForm.email))}`,
        `Phone: ${onlyDigitsPlus(safeForm.phone) || "—"}`,
        `Coaching Type: ${selectedCoachingType}`,
        `Duration: ${safeForm.duration} mins`,
        `Time Zone: ${normalizeSpaces(stripAngleBrackets(safeForm.timeZone))}`,
        `Preferred: ${safeForm.date || "—"} at ${safeForm.time || "—"}`,
        `Google Meet: ${safeForm.preferGoogleMeet ? "Yes" : "No"}`,
        `Marketing Opt-In: ${safeForm.marketingOptIn ? "Yes" : "No"}`,
        `Goals: ${normalizeSpaces(stripAngleBrackets(safeForm.goals)) || "—"}`,
      ].join("\n"),
    [safeForm, selectedCoachingType]
  );

  function setField(name, value) {
    dispatch({
      type: COACHING_ACTIONS.UPDATE_FIELD,
      payload: { name, value },
    });
  }

  function setStatus(next) {
    dispatch({ type: COACHING_ACTIONS.SET_STATUS, payload: next });
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;

    if (name === "coachingType") {
      setField(name, normalizeCoachingType(value));
      return;
    }

    if (name === "phone") {
      setField(name, onlyDigitsPlus(value).slice(0, LIMITS.phone.max));
      return;
    }

    if (name === "duration") {
      const safeDuration = ["30", "60", "90"].includes(value) ? value : "60";
      setField(name, safeDuration);
      return;
    }

    setField(name, type === "checkbox" ? checked : value);
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

    const duration = Number(safeForm.duration);

    if (!fullName) return { ok: false, msg: "Please enter your full name." };

    const nameLenErr = validateLen(
      "Full name",
      fullName,
      LIMITS.fullName.min,
      LIMITS.fullName.max
    );
    if (nameLenErr) return { ok: false, msg: nameLenErr };

    if (hasSpamPattern(fullName)) {
      return { ok: false, msg: "Name looks invalid. Please rewrite it." };
    }

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

    if (!COACHING_TYPES.includes(coachingType)) {
      return { ok: false, msg: "Invalid coaching type selected." };
    }

    if (![30, 60, 90].includes(duration)) {
      return { ok: false, msg: "Invalid duration selected." };
    }

    if (!timeZone) return { ok: false, msg: "Time zone is required." };

    const tzLenErr = validateLen(
      "Time zone",
      timeZone,
      LIMITS.timeZone.min,
      LIMITS.timeZone.max
    );
    if (tzLenErr) return { ok: false, msg: tzLenErr };

    if (!isValidTimeZone(timeZone)) {
      return { ok: false, msg: "Please enter a valid time zone." };
    }

    if (!safeForm.date) return { ok: false, msg: "Pick a preferred date." };

    if (!isValidDateYYYYMMDD(safeForm.date)) {
      return { ok: false, msg: "Invalid date format." };
    }

    if (safeForm.date < today) {
      return { ok: false, msg: "Preferred date cannot be in the past." };
    }

    if (!safeForm.time) return { ok: false, msg: "Pick a preferred time." };

    if (!isValidTimeHHMM(safeForm.time)) {
      return { ok: false, msg: "Invalid time selected." };
    }

    if (!goals) {
      return {
        ok: false,
        msg: "Please write what you want from this session.",
      };
    }

    const goalsLenErr = validateLen(
      "Message",
      goals,
      LIMITS.goals.min,
      LIMITS.goals.max
    );
    if (goalsLenErr) return { ok: false, msg: goalsLenErr };

    if (hasSpamPattern(goals)) {
      return {
        ok: false,
        msg: "Message looks like spam. Please rewrite and try again.",
      };
    }

    if (!safeForm.acceptPolicies) {
      return { ok: false, msg: "Please accept the coaching policies." };
    }

    return {
      ok: true,
      cleaned: {
        fullName,
        email,
        phone,
        goals,
        coachingType,
        timeZone,
        duration,
      },
    };
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (status?.state === "loading") return;

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
      duration: v.cleaned.duration,
      timeZone: v.cleaned.timeZone,
      preferredDate: safeForm.date,
      preferredTime: safeForm.time,
      preferredStartISO,
      preferGoogleMeet: !!safeForm.preferGoogleMeet,
      goals: v.cleaned.goals,
      marketingOptIn: !!safeForm.marketingOptIn,
      emailSubject,
      emailSummary,
      nickName: safeForm.nickName || "",
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
          Accept: "application/json",
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
      const msg =
        err?.name === "AbortError"
          ? "Request timed out. Please try again or book instantly through Cal.com."
          : "Network issue. Your request was not sent. Please try again or use Cal.com.";

      setStatus({
        state: err?.name === "AbortError" ? "warning" : "error",
        message: msg,
      });

      if (typeof showToast === "function") {
        showToast(msg, err?.name === "AbortError" ? "warning" : "error");
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <Page initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Hero>
        <Badge as={motion.div} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          PRIVATE BOXING COACHING
        </Badge>

        <Title as={motion.h1} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          One Mistake Can Make Your Punches Weak — Let’s Fix It Fast.
        </Title>

        <Sub>
          Premium 1-on-1 boxing coaching built to sharpen your power, defense,
          footwork, combinations, conditioning, and fight IQ — even if you train
          without a gym.
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
          <CardTitle>Request Your Private Boxing Session</CardTitle>

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
                  placeholder="America/Los_Angeles"
                />
              </Field>
            </Row>

            <Row>
              <Field>
                <Label htmlFor="date">Preferred date</Label>
                <Input
                  id="date"
                  type="date"
                  name="date"
                  value={safeForm.date}
                  onChange={onChange}
                  required
                  min={today}
                />
              </Field>

              <Field>
                <Label htmlFor="time">Preferred time</Label>
                <Input
                  id="time"
                  type="time"
                  name="time"
                  value={safeForm.time}
                  onChange={onChange}
                  required
                />
              </Field>
            </Row>

            <Row $columns="1">
              <Field>
                <Label htmlFor="goals">What do you want to fix first?</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  value={safeForm.goals}
                  onChange={onChange}
                  rows={5}
                  required
                  minLength={LIMITS.goals.min}
                  maxLength={LIMITS.goals.max}
                  placeholder="Tell me your level, stance, biggest weakness, training setup, and what you want to improve first..."
                />
              </Field>
            </Row>

            <Honeypot aria-hidden="true">
              <label htmlFor="nickName">Nickname</label>
              <input
                id="nickName"
                name="nickName"
                value={safeForm.nickName}
                onChange={onChange}
                tabIndex="-1"
                autoComplete="off"
              />
            </Honeypot>

            <Row $columns="1">
              <Checks>
                <label className="check">
                  <input
                    type="checkbox"
                    name="preferGoogleMeet"
                    checked={!!safeForm.preferGoogleMeet}
                    onChange={onChange}
                  />
                  <span>Use Google Meet</span>
                </label>

                <label className="check">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    checked={!!safeForm.marketingOptIn}
                    onChange={onChange}
                  />
                  <span>
                    Send me occasional KnockoutCodes updates and discounts.
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
              <Primary
                type="submit"
                disabled={status?.state === "loading"}
                aria-busy={status?.state === "loading"}
              >
                {status?.state === "loading"
                  ? "Submitting…"
                  : "Request Private Coaching"}
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
          <PolicyTitle>What You Get Inside</PolicyTitle>

          <HooksList>
            <li>
              <strong>Power:</strong> Clean mechanics so your punches feel heavier.
            </li>
            <li>
              <strong>Speed:</strong> Better rhythm, sharper combinations, less wasted motion.
            </li>
            <li>
              <strong>Defense:</strong> Slips, counters, guard discipline, and distance control.
            </li>
            <li>
              <strong>Footwork:</strong> Angles, balance, exits, and ring IQ.
            </li>
            <li>
              <strong>Plan:</strong> A simple drill structure you can repeat daily.
            </li>
          </HooksList>

          <small>
            Book instantly through Cal.com or submit the form and we’ll confirm
            your session details.
          </small>
        </PolicyCard>
      </Shell>
    </Page>
  );
}

const Page = styled(motion.main)`
  --bg: ${({ theme }) => theme.colors.darkBrown};
  --card: ${({ theme }) => theme.colors.brown};
  --ink: ${({ theme }) => theme.colors.ivory};
  --accent: ${({ theme }) => theme.colors.lightBrown};
  --glass: ${({ theme }) => theme.colors.glass};
  --shadow: ${({ theme }) => theme.shadow.glow};

  min-height: 100svh;
  background:
    radial-gradient(1200px 600px at 10% 0%, rgba(214, 182, 159, 0.16), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(214, 182, 159, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent 30%),
    var(--bg);
  color: var(--ink);
`;

const Hero = styled.header`
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: 78px 20px 32px;
  text-align: center;
`;

const Badge = styled.div`
  display: inline-block;
  padding: 9px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 800;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const Title = styled.h1`
  margin: 18px auto 12px;
  max-width: 950px;
  font-size: clamp(38px, 6vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.04em;
  text-shadow: 0 14px 34px rgba(0, 0, 0, 0.34);
`;

const Sub = styled.p`
  opacity: 0.92;
  max-width: 820px;
  margin: 0 auto;
  font-size: clamp(16px, 1.8vw, 19px);
  line-height: 1.75;
`;

const CalBar = styled.div`
  margin-top: 24px;
  display: inline-flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;

  .cal-btn,
  .form-btn {
    padding: 13px 17px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.lightBrown};
    color: ${({ theme }) => theme.colors.black};
    font-weight: 800;
    border: none;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 14px 28px rgba(214, 182, 159, 0.2);
  }

  .form-btn {
    background: transparent;
    color: ${({ theme }) => theme.colors.white};
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: none;
  }

  .or {
    opacity: 0.7;
    font-size: 14px;
  }
`;

const Shell = styled.section`
  max-width: ${({ theme }) => theme.layout.max};
  margin: 12px auto 90px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 980px) {
    grid-template-columns: 1.2fr 0.8fr;
  }
`;

const Card = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 30%),
    var(--card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: var(--shadow);
  padding: 26px;
`;

const CardTitle = styled.h2`
  font-size: 23px;
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
  opacity: 0.92;
  font-weight: 700;
`;

const inputBase = `
  width: 100%;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 14px;
  color: #fff;
  padding: 13px 14px;
  outline: none;
  transition: 180ms ease;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.22);

  &::placeholder {
    color: rgba(255,255,255,0.48);
  }

  &:focus {
    border-color: rgba(255,255,255,0.48);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.16);
  }
`;

const Input = styled.input`${inputBase}`;

const Select = styled.select`
  ${inputBase}

  option {
    color: #111;
    background: #fff;
  }
`;

const Textarea = styled.textarea`
  ${inputBase}
  resize: vertical;
`;

const Honeypot = styled.div`
  position: absolute;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
`;

const Checks = styled.div`
  display: grid;
  gap: 10px;

  .check {
    display: inline-flex;
    align-items: flex-start;
    gap: 10px;
    user-select: none;
    line-height: 1.55;

    input[type="checkbox"] {
      margin-top: 4px;
      accent-color: ${({ theme }) => theme.colors.lightBrown};
    }

    a {
      color: ${({ theme }) => theme.colors.lightBrown};
      font-weight: 800;
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
  font-weight: 900;
  padding: 14px 19px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(214, 182, 159, 0.26);
  transition: 200ms ease;

  &:hover {
    transform: translateY(-1px) scale(1.01);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Ghost = styled.a`
  background: transparent;
  color: #fff;
  font-weight: 800;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: 200ms ease;
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

const PolicyCard = styled(Card)`
  small {
    display: block;
    opacity: 0.76;
    margin-top: 14px;
    line-height: 1.65;
  }
`;

const PolicyTitle = styled.h3`
  margin: 2px 0 14px;
  font-size: 22px;
`;

const HooksList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 11px;
  line-height: 1.6;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;