// src/pages/Contact.jsx
import { useState, useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { useToast } from "../components/Toast";

// ✅ Redux
import { useDispatch, useSelector } from "react-redux";
import {
  updateContactField,
  setContactStatus,
  resetContactAfterSuccess,
  hydrateContactFromStorage,
} from "../reducers/contact/contactActions";

// ✅ ADDED: reuse axiosInstance (global 401 handling etc.)
import axiosInstance from "../../utils/axiosInstance";

/* ===================== PoW HELPERS (no 3rd party) ===================== */
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function meetsDifficulty(hex, difficultyBits) {
  const zeroHexChars = Math.floor(difficultyBits / 4);
  const leftoverBits = difficultyBits % 4;

  for (let i = 0; i < zeroHexChars; i++) {
    if (hex[i] !== "0") return false;
  }
  if (leftoverBits === 0) return true;

  const nibble = parseInt(hex[zeroHexChars], 16);
  const threshold = 1 << (4 - leftoverBits);
  return nibble < threshold;
}

export default function Contact() {
  const dispatch = useDispatch();
  const form = useSelector((state) => state?.contact?.form);
  const status = useSelector((state) => state?.contact?.status);

  const [errors, setErrors] = useState({});
  const { push } = useToast() || {};

  // ------------------ PoW challenge state ------------------
  const [powChallenge, setPowChallenge] = useState(null);
  const [powReady, setPowReady] = useState(false);
  const [powBusy, setPowBusy] = useState(false);
  const powLoadingRef = useRef(false);

  // ✅ Client-side cooldown (anti-spam, no UI changes)
  const lastSubmitAtRef = useRef(0);
  const COOLDOWN_MS = 12_000;

  // ✅ Cancel token for PoW solving to prevent long loops if user changes email / re-submits
  const powSolveIdRef = useRef(0);

  // ✅ Draft storage key (pro UX: don’t lose message)
  const DRAFT_KEY = "kc_contact_draft";

  // ✅ Hydrate safe draft fields on mount (subject/message only)
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        dispatch(hydrateContactFromStorage(parsed));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Persist safe drafts (subject/message only) as user types
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const subject = String(form?.subject || "");
      const message = String(form?.message || "");

      // only store when user has started typing (avoid writing empty drafts)
      if (!subject && !message) return;

      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          subject,
          message,
        })
      );
    } catch {
      // ignore
    }
  }, [form?.subject, form?.message]);

  // Fetch a new PoW challenge from server
  async function loadPowChallenge() {
    if (powLoadingRef.current) return;
    powLoadingRef.current = true;

    try {
      const res = await axiosInstance.get("/contacts/challenge");
      const data = res?.data;

      if (data?.success && data?.pow) {
        setPowChallenge(data.pow);
        setPowReady(true);
      } else {
        setPowChallenge(null);
        setPowReady(false);
      }
    } catch {
      setPowChallenge(null);
      setPowReady(false);
    } finally {
      powLoadingRef.current = false;
    }
  }

  // Load challenge on mount
  useEffect(() => {
    loadPowChallenge();
  }, []);

  // Solve PoW: find integer answer where sha256(`${nonce}.${email}.${answer}`) meets difficulty
  async function solvePow(email) {
    const solveId = ++powSolveIdRef.current;

    // If no challenge loaded yet, try once
    if (!powChallenge) {
      await loadPowChallenge();
      if (!powChallenge) return null;
    }

    const { nonce, ts, difficulty, sig, ttlMs } = powChallenge;

    const e = String(email || "").trim().toLowerCase();
    if (!e) return null;

    const tsNum = parseInt(String(ts), 10);
    const ttlNum = parseInt(String(ttlMs), 10);

    // Basic expiration guard (client-side)
    if (!Number.isFinite(tsNum) || !Number.isFinite(ttlNum)) return null;
    if (Date.now() - tsNum > ttlNum) {
      await loadPowChallenge();
      return null;
    }

    const MAX_TRIES = 500000;

    setPowBusy(true);
    try {
      for (let answer = 0; answer < MAX_TRIES; answer++) {
        // ✅ Cancel if a newer solve started
        if (solveId !== powSolveIdRef.current) return null;

        const digest = await sha256Hex(`${nonce}.${e}.${answer}`);
        if (meetsDifficulty(digest, difficulty)) {
          return { nonce, ts, difficulty, sig, ttlMs, answer };
        }

        // yield occasionally to keep UI responsive
        if (answer > 0 && answer % 2000 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      return null;
    } finally {
      // only clear busy if THIS solve is still the active one
      if (solveId === powSolveIdRef.current) setPowBusy(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    // ✅ Tighten phone: digits only + max 10
    if (name === "phone") {
      const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 10);
      dispatch(updateContactField(name, digits));
    } else {
      dispatch(updateContactField(name, value));
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (status?.message) dispatch(setContactStatus("idle", ""));

    // ✅ If user edits email while PoW running, cancel current solve loop
    if (name === "email") {
      powSolveIdRef.current += 1;
      setPowBusy(false);
    }
  }

  function validate() {
    const next = {};

    const name = String(form?.name || "").trim();
    if (name.length < 2 || name.length > 60) {
      next.name = "Name must be 2–60 characters.";
    }

    const email = String(form?.email || "").trim();
    if (
      !email ||
      email.length > 70 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      next.email = "Email must be valid and max 70 characters.";
    }

    // ✅ Phone required: exactly 10 digits
    const phone = String(form?.phone || "").trim();
    if (!/^\d{10}$/.test(phone)) {
      next.phone = "Phone must be exactly 10 digits.";
    }

    const subject = String(form?.subject || "").trim();
    if (subject.length < 2 || subject.length > 300) {
      next.subject = "Subject must be 2–300 characters.";
    }

    const message = String(form?.message || "").trim();
    if (message.length < 10 || message.length > 2500) {
      next.message = "Message must be 10–2500 characters.";
    }

    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (status?.state === "submitting") return;

    // Honeypot
    if (form?.company && String(form.company).trim().length > 0) return;

    // ✅ Client cooldown
    const now = Date.now();
    if (now - lastSubmitAtRef.current < COOLDOWN_MS) {
      const waitMs = COOLDOWN_MS - (now - lastSubmitAtRef.current);
      const msg = `Please wait ${Math.ceil(
        waitMs / 1000
      )}s before sending another message.`;
      dispatch(setContactStatus("error", msg));
      if (typeof push === "function") {
        push({ title: "Slow down", description: msg, variant: "error" });
      }
      return;
    }

    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    if (!powReady) {
      await loadPowChallenge();
    }

    const pow = await solvePow(form.email);
    if (!pow) {
      const msg = "Security check failed. Please refresh and try again.";
      dispatch(setContactStatus("error", msg));
      if (typeof push === "function") {
        push({ title: "Security check", description: msg, variant: "error" });
      }
      return;
    }

    let submitted = false;

    try {
      dispatch(setContactStatus("submitting", ""));

      // ✅ uses axiosInstance baseURL (already includes /api/v1)
      const url = "/contacts";

      const res = await axiosInstance.post(
        url,
        {
          name: String(form.name || "").trim(),
          email: String(form.email || "").trim(),
          phone: String(form.phone || "").trim(),
          subject: String(form.subject || "").trim(),
          message: String(form.message || "").trim(),
          company: form.company,
          pow,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to submit message");
      }

      submitted = true;
      lastSubmitAtRef.current = Date.now();

      // ✅ clear redux + clear local draft (pro workflow)
      dispatch(resetContactAfterSuccess());
      try {
        if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      setPowReady(false);
      setPowChallenge(null);
      await loadPowChallenge();

      // ✅ more professional “ticket received” style message
      const msg =
        "Message received ✅ Our team will reply by email as soon as possible (usually within 24 hours).";
      dispatch(setContactStatus("success", msg));

      if (typeof push === "function") {
        push({ title: "Request received", description: msg, variant: "success" });
      }
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

      if (typeof push === "function") {
        push({ title: "Submission failed", description: msg, variant: "error" });
      }
    } finally {
      // ✅ don't rely on stale `status` from closure — always end submitting safely
      if (!submitted) {
        dispatch(setContactStatus("idle", ""));
      }
    }
  }

  const isBusy = status?.state === "submitting" || powBusy;

  return (
    <Wrap className="Contact">
      <Glow />
      <Inner>
        <HookBar aria-hidden>
          <HookBadge>VIP ACCESS</HookBadge>
          <HookText>
            <b>APPLY • CONTACT • ENROLL</b> — Luxury support for serious builders.
          </HookText>
        </HookBar>

        <Header>
          <Title>
            <SpanFlash>Talk to the Admin.</SpanFlash> Get Priority Access.
          </Title>
          <Subtitle>
            Pitch your idea, get help, or lock your enrollment—{" "}
            <Accent>first come, first served</Accent>.
          </Subtitle>
        </Header>

        <Card onSubmit={handleSubmit} noValidate>
          {/* Honeypot */}
          <div
            style={{
              position: "absolute",
              left: "-9999px",
              top: "auto",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
          >
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
          </div>

          {!!status?.message && (
            <Alert role="status" aria-live="polite">
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="10-digit number (e.g., 3105551234)"
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
                placeholder="I want to enroll / partnership / support"
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
              placeholder="Tell us exactly what you need. The more details, the faster we can help."
              value={form?.message || ""}
              onChange={handleChange}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "err-message" : undefined}
              minLength={10}
              maxLength={2500}
              required
            />
            {errors.message && <Error id="err-message">{errors.message}</Error>}
          </Field>

          <div style={{ marginTop: "0.75rem", opacity: 0.75, fontSize: "0.92rem" }}>
            {powBusy
              ? "Running security check…"
              : powReady
              ? "Security: Ready"
              : "Security: Loading…"}
          </div>

          <Actions>
            <Submit disabled={isBusy} type="submit" aria-label="Send message to admin">
              {isBusy ? "Sending…" : "Send Message"}
              <Shimmer />
            </Submit>
            <Note>Response priority goes to complete requests.</Note>
          </Actions>
        </Card>
      </Inner>
    </Wrap>
  );
}

/* ===================== STYLES ===================== */

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
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
  background:
    radial-gradient(1200px 600px at 10% -10%, ${({ theme }) =>
        theme.colors.lightBrown}14, transparent 60%),
    radial-gradient(900px 600px at 90% 110%, ${({ theme }) =>
        theme.colors.ivory}10, transparent 55%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown}, ${({ theme }) =>
        theme.colors.cocoa});
  color: ${({ theme }) => theme.colors.white};
`;

const Glow = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(600px 200px at 50% 0%, ${({ theme }) =>
        theme.colors.lightBrown}18, transparent 55%),
    radial-gradient(520px 320px at 20% 80%, ${({ theme }) =>
        theme.colors.lightBrown}10, transparent 60%);
  mix-blend-mode: screen;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  z-index: 1;
  animation: ${rise} .7s ease both;
`;

const HookBar = styled.div`
  display: flex;
  align-items: center;
  gap: .8rem;
  padding: .6rem .8rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  width: fit-content;
  margin: 0 auto 1.2rem;
  backdrop-filter: blur(8px);
`;

const HookBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .35rem .7rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(120deg, ${({ theme }) => theme.colors.lightBrown}, ${({ theme }) =>
        theme.colors.ivory});
  color: ${({ theme }) => theme.colors.black};
  font-weight: 800;
  letter-spacing: .4px;
  animation: ${pulseRing} 2.4s infinite;
`;

const HookText = styled.span`
  opacity: .9;
  font-size: .9rem;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.1;
  margin: 0 0 .6rem;
  letter-spacing: .2px;
  text-shadow: 0 10px 22px rgba(0,0,0,.35);
`;

const SpanFlash = styled.span`
  background: linear-gradient(120deg, ${({ theme }) => theme.colors.ivory}, ${({ theme }) =>
        theme.colors.lightBrown});
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ${flash} 2.2s ease-in-out 2 both;
`;

const Subtitle = styled.p`
  margin: 0 auto;
  max-width: 760px;
  opacity: .85;
  font-size: 1.05rem;
`;

const Accent = styled.em`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-style: normal;
  font-weight: 700;
`;

const Card = styled.form`
  margin: 2rem auto 0;
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 1.2rem;
  backdrop-filter: blur(10px);
  position: relative;

  @media (min-width: 720px) {
    padding: 2rem;
  }
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
  gap: .45rem;
  ${(props) => props.$full && `grid-column: 1 / -1;`}
`;

const Label = styled.label`
  font-size: .95rem;
  opacity: .9;
`;

const baseField = `
  width: 100%;
  border-radius: 14px;
  padding: 0.95rem 1rem;
  outline: none;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  color: #fff;
  transition: .25s ease;
  box-shadow: inset 0 -20px 40px rgba(255,255,255,.02);

  &::placeholder { color: rgba(255,255,255,.45); }
  &:hover { border-color: rgba(255,255,255,.22); }
  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow:
      0 0 0 4px rgba(214,182,159,.18),
      inset 0 -20px 40px rgba(255,255,255,.04);
    transform: translateY(-1px);
  }
`;

const Input = styled.input`${baseField}`;
const Textarea = styled.textarea`${baseField}; resize: vertical; min-height: 160px;`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.2rem;
  flex-wrap: wrap;
`;

const Submit = styled.button`
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  border: none;
  cursor: pointer;
  padding: .95rem 1.3rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(120deg, ${({ theme }) => theme.colors.lightBrown}, ${({ theme }) =>
        theme.colors.ivory});
  color: ${({ theme }) => theme.colors.black};
  font-weight: 900;
  letter-spacing: .2px;
  box-shadow: ${({ theme }) => theme.shadow.hard};
  transition: transform .18s ease, filter .18s ease, opacity .18s ease;

  &:hover { transform: translateY(-2px) rotate(-.4deg); }
  &:active { transform: translateY(0) scale(.98); filter: brightness(.95); }
  &:disabled { cursor: not-allowed; opacity: .75; transform: none; }
`;

const Shimmer = styled.i`
  position: absolute;
  inset: 0;
  pointer-events: none;
  &:before {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    width: 40%;
    transform: translateX(-120%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
    filter: blur(2px);
    animation: ${sheen} 1.6s ease-in-out .3s forwards;
  }
`;

const Note = styled.span`
  opacity: .7;
  font-size: .92rem;
`;

const Error = styled.span`
  color: #ffb3b3;
  font-size: .85rem;
`;

const Alert = styled.div`
  margin-bottom: 1rem;
  border-radius: 12px;
  padding: .9rem 1rem;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  font-size: .95rem;
  line-height: 1.35;
`;
