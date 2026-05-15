// src/pages/Contact.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
import { useToast } from "../components/Toast";

import { useDispatch, useSelector } from "react-redux";
import {
  updateContactField,
  setContactStatus,
  resetContactAfterSuccess,
  hydrateContactFromStorage,
} from "../reducers/contact/contactActions";

import axiosInstance from "../../utils/axiosInstance";

async function sha256Hex(str) {
  if (!window?.crypto?.subtle) {
    throw new Error("Security check is not supported in this browser.");
  }

  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);

  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function meetsDifficulty(hex, difficultyBits) {
  const zeroHexChars = Math.floor(Number(difficultyBits) / 4);
  const leftoverBits = Number(difficultyBits) % 4;

  for (let i = 0; i < zeroHexChars; i += 1) {
    if (hex[i] !== "0") return false;
  }

  if (leftoverBits === 0) return true;

  const nibble = parseInt(hex[zeroHexChars], 16);
  const threshold = 1 << (4 - leftoverBits);

  return nibble < threshold;
}

export default function Contact() {
  const dispatch = useDispatch();

  const form = useSelector((state) => state?.contact?.form || {});
  const status = useSelector(
    (state) => state?.contact?.status || { state: "idle", message: "" }
  );

  const [errors, setErrors] = useState({});
  const toast = useToast();
  const push = toast?.push;

  const [powChallenge, setPowChallenge] = useState(null);
  const [powReady, setPowReady] = useState(false);
  const [powBusy, setPowBusy] = useState(false);

  const powLoadingRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const powSolveIdRef = useRef(0);

  const COOLDOWN_MS = 12_000;
  const DRAFT_KEY = "kc_contact_draft";

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;

      const parsed = raw ? JSON.parse(raw) : null;

      if (parsed && typeof parsed === "object") {
        dispatch(
          hydrateContactFromStorage({
            subject: String(parsed.subject || ""),
            message: String(parsed.message || ""),
          })
        );
      }
    } catch {
      // ignore broken localStorage draft
    }
  }, [dispatch]);

  const loadPowChallenge = useCallback(async () => {
    if (powLoadingRef.current) return null;

    powLoadingRef.current = true;

    try {
      const res = await axiosInstance.get("/contacts/challenge");
      const data = res?.data;

      if (data?.success && data?.pow) {
        setPowChallenge(data.pow);
        setPowReady(true);
        return data.pow;
      }

      setPowChallenge(null);
      setPowReady(false);
      return null;
    } catch {
      setPowChallenge(null);
      setPowReady(false);
      return null;
    } finally {
      powLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPowChallenge();
  }, [loadPowChallenge]);

  async function solvePow(email) {
    const solveId = ++powSolveIdRef.current;

    let challenge = powChallenge;

    if (!challenge) {
      challenge = await loadPowChallenge();
      if (!challenge) return null;
    }

    const { nonce, ts, difficulty, sig, ttlMs } = challenge;

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return null;

    const tsNum = Number(ts);
    const ttlNum = Number(ttlMs);

    if (!Number.isFinite(tsNum) || !Number.isFinite(ttlNum)) return null;

    if (Date.now() - tsNum > ttlNum) {
      const freshChallenge = await loadPowChallenge();
      if (!freshChallenge) return null;

      return solvePow(cleanEmail);
    }

    const MAX_TRIES = 500000;

    setPowBusy(true);

    try {
      for (let answer = 0; answer < MAX_TRIES; answer += 1) {
        if (solveId !== powSolveIdRef.current) return null;

        const digest = await sha256Hex(`${nonce}.${cleanEmail}.${answer}`);

        if (meetsDifficulty(digest, difficulty)) {
          return { nonce, ts, difficulty, sig, ttlMs, answer };
        }

        if (answer > 0 && answer % 2000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      return null;
    } finally {
      if (solveId === powSolveIdRef.current) {
        setPowBusy(false);
      }
    }
  }

  function notify(title, description, variant = "default") {
    if (typeof push === "function") {
      push({ title, description, variant });
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "phone") {
      const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
      dispatch(updateContactField(name, digits));
    } else {
      dispatch(updateContactField(name, value));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (status?.message) {
      dispatch(setContactStatus("idle", ""));
    }

    if (name === "email") {
      powSolveIdRef.current += 1;
      setPowBusy(false);
    }
  }

  function validate() {
    const next = {};

    const name = String(form?.name || "").trim();
    const email = String(form?.email || "").trim();
    const phone = String(form?.phone || "").trim();
    const subject = String(form?.subject || "").trim();
    const message = String(form?.message || "").trim();

    if (name.length < 2 || name.length > 60) {
      next.name = "Name must be 2–60 characters.";
    }

    if (
      !email ||
      email.length > 70 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      next.email = "Email must be valid and max 70 characters.";
    }

    if (!/^\d{10}$/.test(phone)) {
      next.phone = "Phone must be exactly 10 digits.";
    }

    if (subject.length < 2 || subject.length > 300) {
      next.subject = "Subject must be 2–300 characters.";
    }

    if (message.length < 10 || message.length > 2500) {
      next.message = "Message must be 10–2500 characters.";
    }

    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (status?.state === "submitting" || powBusy) return;

    if (form?.company && String(form.company).trim().length > 0) return;

    const now = Date.now();

    if (now - lastSubmitAtRef.current < COOLDOWN_MS) {
      const waitMs = COOLDOWN_MS - (now - lastSubmitAtRef.current);
      const msg = `Please wait ${Math.ceil(
        waitMs / 1000
      )}s before sending another message.`;

      dispatch(setContactStatus("error", msg));
      notify("Slow down", msg, "error");
      return;
    }

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      dispatch(setContactStatus("error", "Please fix the highlighted fields."));
      return;
    }

    dispatch(setContactStatus("submitting", ""));

    try {
      const pow = await solvePow(form.email);

      if (!pow) {
        throw new Error("Security check failed. Please refresh and try again.");
      }

      const res = await axiosInstance.post(
        "/contacts",
        {
          name: String(form.name || "").trim(),
          email: String(form.email || "").trim(),
          phone: String(form.phone || "").trim(),
          subject: String(form.subject || "").trim(),
          message: String(form.message || "").trim(),
          company: String(form.company || ""),
          pow,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to submit message.");
      }

      lastSubmitAtRef.current = Date.now();

      dispatch(resetContactAfterSuccess());

      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // ignore
      }

      setPowReady(false);
      setPowChallenge(null);
      await loadPowChallenge();

      const msg =
        "Message received ✅ Our team will reply by email as soon as possible, usually within 24 hours.";

      dispatch(setContactStatus("success", msg));
      notify("Request received", msg, "success");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";

      dispatch(setContactStatus("error", msg));

      if (/security|expired|challenge/i.test(msg)) {
        setPowReady(false);
        setPowChallenge(null);
        await loadPowChallenge();
      }

      notify("Submission failed", msg, "error");
    }
  }

  const isBusy = status?.state === "submitting" || powBusy;

  return (
    <Wrap className="Contact">
      <Glow />

      <Inner>
        <HookBar aria-hidden="true">
          <HookBadge>VIP ACCESS</HookBadge>
          <HookText>
            <b>APPLY • CONTACT • ENROLL</b> — Premium support for serious
            builders.
          </HookText>
        </HookBar>

        <Header>
          <Eyebrow>KnockoutCodes Support Desk</Eyebrow>
          <Title>
            <SpanFlash>Talk to the Admin.</SpanFlash> Get Priority Access.
          </Title>
          <Subtitle>
            Pitch your idea, request help, ask about enrollment, or contact the
            team directly. <Accent>Complete requests get faster replies.</Accent>
          </Subtitle>
        </Header>

        <Card onSubmit={handleSubmit} noValidate>
          <BotTrap aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              value={form?.company || ""}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
            />
          </BotTrap>

          {!!status?.message && (
            <Alert $state={status?.state} role="status" aria-live="polite">
              {status.message}
            </Alert>
          )}

          <Row>
            <Field>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Yakubu Amidu"
                value={form?.name || ""}
                onChange={handleChange}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-name" : undefined}
                minLength={2}
                maxLength={60}
                required
              />
              {errors.name && <Error id="err-name">{errors.name}</Error>}
            </Field>

            <Field>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@domain.com"
                value={form?.email || ""}
                onChange={handleChange}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "err-email" : undefined}
                maxLength={70}
                required
              />
              {errors.email && <Error id="err-email">{errors.email}</Error>}
            </Field>
          </Row>

          <Row>
            <Field>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="3105551234"
                value={form?.phone || ""}
                onChange={handleChange}
                inputMode="numeric"
                pattern="\d{10}"
                minLength={10}
                maxLength={10}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "err-phone" : undefined}
                required
              />
              {errors.phone && <Error id="err-phone">{errors.phone}</Error>}
            </Field>

            <Field>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                placeholder="Enrollment / Partnership / Support"
                value={form?.subject || ""}
                onChange={handleChange}
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? "err-subject" : undefined}
                minLength={2}
                maxLength={300}
                required
              />
              {errors.subject && (
                <Error id="err-subject">{errors.subject}</Error>
              )}
            </Field>
          </Row>

          <Field $full>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              rows="6"
              placeholder="Tell us exactly what you need. The more detail you give, the faster we can help."
              value={form?.message || ""}
              onChange={handleChange}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "err-message" : undefined}
              minLength={10}
              maxLength={2500}
              required
            />
            <Counter>{String(form?.message || "").length}/2500</Counter>
            {errors.message && <Error id="err-message">{errors.message}</Error>}
          </Field>

          <SecurityLine>
            <SecurityDot $ready={powReady && !powBusy} />
            {powBusy
              ? "Running premium security check…"
              : powReady
              ? "Security ready"
              : "Preparing security check…"}
          </SecurityLine>

          <Actions>
            <Submit disabled={isBusy} type="submit">
              {isBusy ? "Sending…" : "Send Message"}
              <Shimmer />
            </Submit>

            <Note>Priority goes to complete, clear requests.</Note>
          </Actions>
        </Card>
      </Inner>
    </Wrap>
  );
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(14px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(214,182,159,.45); }
  70% { box-shadow: 0 0 0 18px rgba(214,182,159,0); }
  100% { box-shadow: 0 0 0 0 rgba(214,182,159,0); }
`;

const flash = keyframes`
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.35); }
`;

const sheen = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const Wrap = styled.section`
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 6rem 1.25rem;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
      1000px 520px at 12% -10%,
      ${({ theme }) => theme.colors.lightBrown}18,
      transparent 60%
    ),
    radial-gradient(
      850px 520px at 90% 105%,
      ${({ theme }) => theme.colors.ivory}12,
      transparent 55%
    ),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown},
      ${({ theme }) => theme.colors.cocoa}
    );
`;

const Glow = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.04), transparent 35%),
    radial-gradient(
      600px 220px at 50% 0%,
      ${({ theme }) => theme.colors.lightBrown}18,
      transparent 58%
    );
  mix-blend-mode: screen;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  z-index: 1;
  animation: ${rise} 0.7s ease both;
`;

const HookBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 1.2rem;
  padding: 0.6rem 0.8rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(12px);

  @media (max-width: 560px) {
    align-items: flex-start;
    border-radius: ${({ theme }) => theme.radius.lg};
  }
`;

const HookBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 0.35rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 900;
  letter-spacing: 0.5px;
  animation: ${pulseRing} 2.4s infinite;
`;

const HookText = styled.span`
  opacity: 0.92;
  font-size: 0.9rem;
  line-height: 1.45;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.7rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.78rem;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.45rem);
  line-height: 1.06;
  margin: 0 0 0.75rem;
  letter-spacing: -0.04em;
  text-shadow: 0 18px 32px rgba(0, 0, 0, 0.38);
`;

const SpanFlash = styled.span`
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ${flash} 2.2s ease-in-out 2 both;
`;

const Subtitle = styled.p`
  margin: 0 auto;
  max-width: 780px;
  opacity: 0.86;
  font-size: 1.05rem;
  line-height: 1.65;
`;

const Accent = styled.em`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-style: normal;
  font-weight: 800;
`;

const Card = styled.form`
  margin: 2rem auto 0;
  position: relative;
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035)),
    ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(14px);

  &::before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.14),
      transparent 35%,
      rgba(214, 182, 159, 0.08)
    );
  }

  @media (min-width: 720px) {
    padding: 2rem;
  }
`;

const BotTrap = styled.div`
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const Row = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 720px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 0.45rem;
  ${({ $full }) =>
    $full &&
    css`
      grid-column: 1 / -1;
    `}
`;

const Label = styled.label`
  font-size: 0.94rem;
  opacity: 0.92;
  font-weight: 800;
`;

const fieldStyles = css`
  width: 100%;
  border-radius: 16px;
  padding: 0.98rem 1rem;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.white};
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease,
    background 0.22s ease;
  box-shadow:
    inset 0 -20px 40px rgba(255, 255, 255, 0.02),
    0 10px 24px rgba(0, 0, 0, 0.1);

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.24);
    background: rgba(0, 0, 0, 0.34);
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow:
      0 0 0 4px rgba(214, 182, 159, 0.18),
      inset 0 -20px 40px rgba(255, 255, 255, 0.04);
    transform: translateY(-1px);
  }

  &[aria-invalid="true"] {
    border-color: rgba(255, 120, 120, 0.8);
    box-shadow: 0 0 0 4px rgba(255, 120, 120, 0.12);
  }
`;

const Input = styled.input`
  ${fieldStyles}
`;

const Textarea = styled.textarea`
  ${fieldStyles}
  resize: vertical;
  min-height: 170px;
  line-height: 1.65;
`;

const Counter = styled.span`
  justify-self: end;
  opacity: 0.58;
  font-size: 0.8rem;
`;

const SecurityLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  width: fit-content;
  margin-top: 0.25rem;
  padding: 0.55rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.86;
  font-size: 0.92rem;
`;

const SecurityDot = styled.span`
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: ${({ $ready }) => ($ready ? "#65ff9a" : "#ffd166")};
  box-shadow: ${({ $ready }) =>
    $ready ? "0 0 18px rgba(101,255,154,.65)" : "0 0 18px rgba(255,209,102,.55)"};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
`;

const Submit = styled.button`
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  gap: 0.6rem;
  border: none;
  cursor: pointer;
  padding: 0.98rem 1.45rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  letter-spacing: 0.2px;
  box-shadow: ${({ theme }) => theme.shadow.hard};
  transition:
    transform 0.18s ease,
    filter 0.18s ease,
    opacity 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.03);
  }

  &:active {
    transform: translateY(0) scale(0.98);
    filter: brightness(0.95);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
    transform: none;
  }
`;

const Shimmer = styled.i`
  position: absolute;
  inset: 0;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    transform: translateX(-120%);
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.55),
      transparent
    );
    filter: blur(2px);
    animation: ${sheen} 1.8s ease-in-out 0.3s forwards;
  }
`;

const Note = styled.span`
  opacity: 0.72;
  font-size: 0.92rem;
`;

const Error = styled.span`
  color: #ffb3b3;
  font-size: 0.85rem;
  font-weight: 700;
`;

const Alert = styled.div`
  margin-bottom: 0.2rem;
  border-radius: 16px;
  padding: 0.95rem 1rem;
  background: ${({ $state }) =>
    $state === "success"
      ? "rgba(70, 255, 150, 0.1)"
      : $state === "error"
      ? "rgba(255, 100, 100, 0.1)"
      : "rgba(0, 0, 0, 0.35)"};
  border: 1px solid
    ${({ $state }) =>
      $state === "success"
        ? "rgba(70, 255, 150, 0.24)"
        : $state === "error"
        ? "rgba(255, 100, 100, 0.24)"
        : "rgba(255,255,255,.12)"};
  font-size: 0.95rem;
  line-height: 1.45;
`;