// src/pages/Coaching.jsx
import { useMemo, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "../components/Toast";
import { getCsrfToken } from "../../utils/csrf";
import { COACHING_ACTIONS } from "../reducers/coaching/coachingActionTypes";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

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
  timeZone: { min: 3, max: 60 },
  goals: { min: 20, max: 1200 },
};

const TRAINING_PROMISES = [
  "Cleaner punch mechanics",
  "Sharper defense and counters",
  "Better footwork and balance",
  "Simple drills you can repeat daily",
];

const PREMIUM_RESULTS = [
  {
    title: "Power",
    text: "Fix wasted motion so your shots land cleaner, heavier, and sharper.",
  },
  {
    title: "Defense",
    text: "Build slips, guard discipline, distance control, and counters.",
  },
  {
    title: "Footwork",
    text: "Learn angles, exits, balance, and ring IQ without needing a gym.",
  },
];

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

function toISOFromLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00`;
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
  const tooManyLinks = (links?.length || 0) >= 2;
  const repeatingChars = /([a-zA-Z0-9!?.])\1{9,}/.test(value);
  return tooManyLinks || repeatingChars;
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
  const isSubmittingRef = useRef(false);

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
    sessionMethod: "Google Meet",
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
        `Session Method: ${
          safeForm.preferGoogleMeet
            ? "Google Meet"
            : safeForm.sessionMethod || "Phone Call"
        }`,
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
      setField(name, ["30", "60", "90"].includes(value) ? value : "60");
      return;
    }

    if (name === "preferGoogleMeet") {
      const nextChecked = !!checked;
      setField("preferGoogleMeet", nextChecked);
      if (nextChecked) setField("sessionMethod", "Google Meet");
      else if (!safeForm.sessionMethod || safeForm.sessionMethod === "Google Meet") {
        setField("sessionMethod", "Phone Call");
      }
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
    if (isSubmittingRef.current) return;

    const v = validate();

    if (!v.ok) {
      setStatus({ state: "error", message: v.msg });
      if (typeof showToast === "function") showToast(v.msg, "error");
      return;
    }

    isSubmittingRef.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      setStatus({
        state: "loading",
        message: "Submitting your private coaching request…",
      });

      const preferredStartISO = toISOFromLocalDateTime(
        safeForm.date,
        safeForm.time
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
        sessionMethod: safeForm.preferGoogleMeet
          ? "Google Meet"
          : safeForm.sessionMethod || "Phone Call",
        goals: v.cleaned.goals,
        marketingOptIn: !!safeForm.marketingOptIn,
        emailSubject,
        emailSummary,
        nickName: safeForm.nickName || "",
        source: {
          channel: "web",
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      };

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
        data?.message || "Request received. We’ll email you shortly.";

      setStatus({ state: "success", message: successMsg });

      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

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
      isSubmittingRef.current = false;
    }
  }

  return (
    <Page initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      <Hero>
        <HeroGlow />

        <Badge as={motion.div} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          Private KnockoutCodes Boxing Coaching
        </Badge>

        <Title
          as={motion.h1}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          Your Punch Is Not Weak. Your Mechanics Are Leaking Power.
        </Title>

        <Sub>
          Get premium 1-on-1 boxing coaching built to sharpen power, defense,
          footwork, combinations, conditioning, and fight IQ — even if you train
          outside, at home, or without a gym.
        </Sub>

        <PromiseBar>
          {TRAINING_PROMISES.map((item) => (
            <span key={item}>✓ {item}</span>
          ))}
        </PromiseBar>

        {CAL_URL && (
          <CalBar>
            <a href={CAL_URL} target="_blank" rel="noreferrer" className="cal-btn">
              Book Instantly
            </a>
            <span className="or">or</span>
            <a className="form-btn" href="#book-form">
              Request Below
            </a>
          </CalBar>
        )}
      </Hero>

      <Shell>
        <FormCard
          as={motion.div}
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 120, damping: 18 }}
        >
          <CardHeader>
            <MiniLabel>Elite Session Request</MiniLabel>
            <CardTitle>Tell Me What You Want Fixed First</CardTitle>
            <CardText>
              The better your details, the sharper the session. Share your level,
              stance, biggest weakness, and what you want to improve.
            </CardText>
          </CardHeader>

          {status?.message && (
            <StatusMessage $state={status?.state}>{status.message}</StatusMessage>
          )}

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
                  aria-required="true"
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
                  aria-required="true"
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
                  placeholder="+1 555 000 0000"
                  required
                  aria-required="true"
                  minLength={LIMITS.phone.min}
                  maxLength={LIMITS.phone.max}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>

              <Field>
                <Label htmlFor="coachingType">Coaching focus</Label>
                <Select
                  id="coachingType"
                  name="coachingType"
                  value={selectedCoachingType}
                  onChange={onChange}
                  required
                  aria-required="true"
                >
                  {COACHING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
            </Row>

            <Row>
              <Field>
                <Label htmlFor="duration">Session duration</Label>
                <Select
                  id="duration"
                  name="duration"
                  value={safeForm.duration}
                  onChange={onChange}
                  required
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
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
                  aria-required="true"
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
                  rows={6}
                  required
                  aria-required="true"
                  minLength={LIMITS.goals.min}
                  maxLength={LIMITS.goals.max}
                  placeholder="Example: I’m orthodox, my right hand feels slow, I lose balance after combinations, and I want sharper footwork without training in a gym..."
                />
                <Hint $count={String(safeForm.goals || "").length}>
                  {String(safeForm.goals || "").length}/{LIMITS.goals.max} characters
                </Hint>
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
                  <span>Use Google Meet for the session.</span>
                </label>

                {!safeForm.preferGoogleMeet && (
                  <MethodBox>
                    <Label htmlFor="sessionMethod">Choose another session method</Label>
                    <Select
                      id="sessionMethod"
                      name="sessionMethod"
                      value={safeForm.sessionMethod || "Phone Call"}
                      onChange={onChange}
                      required
                      aria-required="true"
                    >
                      <option value="Phone Call">Phone Call</option>
                      <option value="Zoom">Zoom</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </Select>
                  </MethodBox>
                )}

                <label className="check">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    checked={!!safeForm.marketingOptIn}
                    onChange={onChange}
                  />
                  <span>Send me occasional KnockoutCodes updates and discounts.</span>
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
                  Book Through Cal.com
                </Ghost>
              )}
            </Actions>
          </Form>
        </FormCard>

        <SidePanel
          as={motion.aside}
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 120, damping: 18 }}
        >
          <PanelTop>
            <MiniLabel>What You Get</MiniLabel>
            <PolicyTitle>Train Cleaner. Move Smarter. Hit Harder.</PolicyTitle>
            <PanelText>
              This is not random boxing advice. This is a focused private session
              built around your weakness, your level, your setup, and your next step.
            </PanelText>
          </PanelTop>

          <ResultGrid>
            {PREMIUM_RESULTS.map((item) => (
              <ResultCard key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </ResultCard>
            ))}
          </ResultGrid>

          <LuxuryNote>
            <span>Best for:</span>
            beginners, self-trained fighters, outdoor training, bagwork, defense,
            footwork, power mechanics, and confidence on camera or in sparring.
          </LuxuryNote>
        </SidePanel>
      </Shell>
    </Page>
  );
}

const Page = styled(motion.main)`
  --bg: ${({ theme }) => theme?.colors?.darkBrown || "#130c09"};
  --card: ${({ theme }) => theme?.colors?.brown || "#221610"};
  --ink: ${({ theme }) => theme?.colors?.ivory || "#fff8ef"};
  --accent: ${({ theme }) => theme?.colors?.lightBrown || "#d6b69f"};
  --glass: ${({ theme }) => theme?.colors?.glass || "rgba(255,255,255,0.08)"};
  --black: ${({ theme }) => theme?.colors?.black || "#050505"};
  --white: ${({ theme }) => theme?.colors?.white || "#ffffff"};
  --shadow: ${({ theme }) => theme?.shadow?.glow || "0 24px 80px rgba(0,0,0,0.38)"};

  min-height: 100svh;
  overflow: hidden;
  background:
    radial-gradient(900px 520px at 8% 0%, rgba(214, 182, 159, 0.2), transparent 62%),
    radial-gradient(760px 460px at 88% 8%, rgba(255, 255, 255, 0.08), transparent 58%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent 35%),
    var(--bg);
  color: var(--ink);
`;

const Hero = styled.header`
  position: relative;
  max-width: ${({ theme }) => theme?.layout?.max || "1180px"};
  margin: 0 auto;
  padding: 86px 20px 36px;
  text-align: center;
`;

const HeroGlow = styled.div`
  position: absolute;
  inset: 18px 16% auto;
  height: 220px;
  pointer-events: none;
  background: radial-gradient(circle, rgba(214, 182, 159, 0.18), transparent 68%);
  filter: blur(18px);
`;

const Badge = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 17px;
  border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
  background: rgba(255, 255, 255, 0.075);
  box-shadow: ${({ theme }) => theme?.shadow?.soft || "0 14px 32px rgba(0,0,0,0.2)"};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 900;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  backdrop-filter: blur(18px);
`;

const Title = styled.h1`
  position: relative;
  margin: 20px auto 14px;
  max-width: 980px;
  font-size: clamp(40px, 6.4vw, 82px);
  line-height: 0.98;
  letter-spacing: -0.055em;
  text-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
`;

const Sub = styled.p`
  position: relative;
  opacity: 0.92;
  max-width: 850px;
  margin: 0 auto;
  font-size: clamp(16px, 1.8vw, 20px);
  line-height: 1.78;
`;

const PromiseBar = styled.div`
  margin: 26px auto 0;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 950px;

  span {
    padding: 10px 13px;
    border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
    background: rgba(255, 255, 255, 0.065);
    border: 1px solid rgba(255, 255, 255, 0.11);
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    font-weight: 800;
  }
`;

const CalBar = styled.div`
  margin-top: 26px;
  display: inline-flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;

  .cal-btn,
  .form-btn {
    padding: 14px 18px;
    border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
    font-weight: 900;
    cursor: pointer;
    text-decoration: none;
    transition: 220ms ease;
  }

  .cal-btn {
    background: var(--accent);
    color: var(--black);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 18px 38px rgba(214, 182, 159, 0.24);
  }

  .form-btn {
    background: rgba(255, 255, 255, 0.055);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .cal-btn:hover,
  .form-btn:hover {
    transform: translateY(-2px);
  }

  .or {
    opacity: 0.65;
    font-size: 14px;
  }
`;

const Shell = styled.section`
  max-width: ${({ theme }) => theme?.layout?.max || "1180px"};
  margin: 16px auto 96px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 22px;

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 1.18fr) minmax(330px, 0.82fr);
    align-items: start;
  }
`;

const GlassCard = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0) 36%),
    rgba(34, 22, 16, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${({ theme }) => theme?.radius?.lg || "28px"};
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
`;

const FormCard = styled(GlassCard)`
  padding: clamp(20px, 3vw, 30px);
`;

const CardHeader = styled.div`
  margin-bottom: 20px;
`;

const MiniLabel = styled.span`
  display: inline-block;
  margin-bottom: 9px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const CardTitle = styled.h2`
  font-size: clamp(24px, 2.8vw, 36px);
  line-height: 1.05;
  margin: 0 0 10px;
  letter-spacing: -0.035em;
`;

const CardText = styled.p`
  margin: 0;
  opacity: 0.78;
  line-height: 1.7;
`;

const StatusMessage = styled.div`
  margin: 0 0 16px;
  padding: 13px 15px;
  border-radius: 18px;
  line-height: 1.55;
  font-weight: 800;
  color: ${({ $state }) => ($state === "success" ? "#dfffe7" : "#fff4df")};
  background: ${({ $state }) =>
    $state === "success"
      ? "rgba(46, 204, 113, 0.14)"
      : $state === "warning"
        ? "rgba(255, 193, 7, 0.14)"
        : "rgba(255, 82, 82, 0.13)"};
  border: 1px solid
    ${({ $state }) =>
      $state === "success"
        ? "rgba(46, 204, 113, 0.25)"
        : $state === "warning"
          ? "rgba(255, 193, 7, 0.24)"
          : "rgba(255, 82, 82, 0.22)"};
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

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  opacity: 0.94;
  font-weight: 850;
`;

const inputBase = `
  width: 100%;
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 16px;
  color: #fff;
  padding: 14px 14px;
  outline: none;
  transition: 190ms ease;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.25);

  &::placeholder {
    color: rgba(255,255,255,0.44);
  }

  &:hover {
    border-color: rgba(214,182,159,0.34);
    background: rgba(255,255,255,0.07);
  }

  &:focus {
    border-color: rgba(214,182,159,0.78);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.15);
    background: rgba(255,255,255,0.075);
  }
`;

const Input = styled.input`
  ${inputBase}
`;

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
  min-height: 150px;
`;

const Hint = styled.small`
  text-align: right;
  font-weight: 700;

  color: ${({ $count }) => {
    if ($count >= 1000) return "#ff6b6b";
    if ($count >= 800) return "#ffd166";
    return "rgba(255,255,255,0.58)";
  }};
`;

const Honeypot = styled.div`
  position: absolute;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
`;

const Checks = styled.div`
  display: grid;
  gap: 11px;
  padding: 4px 0;

  .check {
    display: inline-flex;
    align-items: flex-start;
    gap: 10px;
    user-select: none;
    line-height: 1.58;
    color: rgba(255, 255, 255, 0.88);
  }

  input[type="checkbox"] {
    margin-top: 5px;
    accent-color: var(--accent);
  }

  a {
    color: var(--accent);
    font-weight: 900;
  }
`;

const MethodBox = styled.div`
  margin-top: 8px;
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 4px;
`;

const Primary = styled.button`
  background: var(--accent);
  color: var(--black);
  font-weight: 950;
  padding: 15px 20px;
  border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
  border: none;
  cursor: pointer;
  box-shadow: 0 18px 38px rgba(214, 182, 159, 0.25);
  transition: 220ms ease;

  &:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 24px 44px rgba(214, 182, 159, 0.32);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }
`;

const Ghost = styled.a`
  background: rgba(255, 255, 255, 0.055);
  color: var(--white);
  font-weight: 900;
  padding: 15px 19px;
  border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: 220ms ease;
  text-decoration: none;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.085);
  }
`;

const SidePanel = styled(GlassCard)`
  padding: clamp(20px, 3vw, 28px);
  position: sticky;
  top: 20px;

  @media (max-width: 979px) {
    position: static;
  }
`;

const PanelTop = styled.div`
  margin-bottom: 18px;
`;

const PolicyTitle = styled.h3`
  margin: 0 0 10px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.05;
  letter-spacing: -0.035em;
`;

const PanelText = styled.p`
  margin: 0;
  opacity: 0.78;
  line-height: 1.75;
`;

const ResultGrid = styled.div`
  display: grid;
  gap: 13px;
`;

const ResultCard = styled.div`
  padding: 15px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.11);

  strong {
    display: block;
    color: var(--accent);
    margin-bottom: 6px;
    font-size: 15px;
  }

  span {
    display: block;
    line-height: 1.62;
    opacity: 0.82;
  }
`;

const LuxuryNote = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(214, 182, 159, 0.16), rgba(255, 255, 255, 0.045));
  border: 1px solid rgba(214, 182, 159, 0.22);
  line-height: 1.7;
  opacity: 0.9;

  span {
    display: block;
    color: var(--accent);
    font-weight: 950;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 12px;
  }
`;