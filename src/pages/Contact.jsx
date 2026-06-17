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
    (state) => state?.contact?.status || { state: "idle", message: "" },
  );
  const authUser = useSelector(
    (state) => state?.auth?.user || state?.auth?.currentUser || null,
  );

  const [errors, setErrors] = useState({});
  const toast = useToast();
  const push = toast?.push || toast?.showToast;

  const [powChallenge, setPowChallenge] = useState(null);
  const [powReady, setPowReady] = useState(false);
  const [powBusy, setPowBusy] = useState(false);

  const powLoadingRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const powSolveIdRef = useRef(0);

  const COOLDOWN_MS = 12_000;
  const DRAFT_KEY = "kc_contact_draft";

  const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";

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
          }),
        );
      }
    } catch {
      // ignore broken localStorage draft
    }
  }, [dispatch]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const subject = String(form?.subject || "");
      const message = String(form?.message || "");

      if (!subject && !message) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }

      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          subject,
          message,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore localStorage issues
    }
  }, [form?.subject, form?.message]);

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

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
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
      const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 10);
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

    if (isAdmin) {
      const msg = "Admin accounts cannot submit public contact requests.";
      dispatch(setContactStatus("error", msg));
      notify("Admin blocked", msg, "error");
      return;
    }

    if (status?.state === "submitting" || powBusy) return;

    if (form?.company && String(form.company).trim().length > 0) return;

    const now = Date.now();

    if (now - lastSubmitAtRef.current < COOLDOWN_MS) {
      const waitMs = COOLDOWN_MS - (now - lastSubmitAtRef.current);
      const msg = `Please wait ${Math.ceil(
        waitMs / 1000,
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
          email: String(form.email || "")
            .trim()
            .toLowerCase(),
          phone: String(form.phone || "").trim(),
          subject: String(form.subject || "").trim(),
          message: String(form.message || "").trim(),
          company: String(form.company || ""),
          pow,
        },
        { headers: { "Content-Type": "application/json" } },
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
        "Message received. Our team will reply by email as soon as possible, usually within 24 hours.";

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

  const isBusy = status?.state === "submitting" || powBusy || isAdmin;

  return (
    <Wrap className="Contact">
      <LuxuryGlowOne />
      <LuxuryGlowTwo />
      <PatternOverlay />

      <Inner>
        <HookBar aria-hidden="true">
          <HookBadge>VIP SUPPORT</HookBadge>
          <HookText>
            <b>CONTACT • SUPPORT • PARTNERSHIP</b> — Premium help for serious
            builders, buyers, and members.
          </HookText>
        </HookBar>

        <Header>
          <Eyebrow>KnockoutCodes Private Support Desk</Eyebrow>

          <Title>
            Speak With The Team. <span>Get A Clear Reply.</span>
          </Title>

          <Subtitle>
            Need help with an order, product, membership, course access,
            booking, or partnership? Send a complete request and our team can
            respond faster with the right answer.
          </Subtitle>
        </Header>

        <Layout>
          <InfoPanel>
            <PanelTop>
              <PanelBadge>5-Star Contact Experience</PanelBadge>
              <PanelTitle>Built for serious requests.</PanelTitle>
              <PanelText>
                This page is protected with form validation, cooldown control,
                bot-trap protection, and a browser security challenge before the
                message is accepted.
              </PanelText>
            </PanelTop>

            <FeatureList>
              <FeatureItem>
                <FeatureIcon>✓</FeatureIcon>
                <div>
                  <strong>Order & product support</strong>
                  <p>
                    Ask about purchases, delivery, tracking, or product access.
                  </p>
                </div>
              </FeatureItem>

              <FeatureItem>
                <FeatureIcon>✓</FeatureIcon>
                <div>
                  <strong>Membership & course help</strong>
                  <p>
                    Request help with access, enrollment, billing, or account
                    issues.
                  </p>
                </div>
              </FeatureItem>

              <FeatureItem>
                <FeatureIcon>✓</FeatureIcon>
                <div>
                  <strong>Partnership inquiries</strong>
                  <p>
                    Send serious business, brand, training, or collaboration
                    requests.
                  </p>
                </div>
              </FeatureItem>
            </FeatureList>

            <TrustBox>
              <TrustNumber>24h</TrustNumber>
              <TrustCopy>
                Typical reply window for complete and clear requests.
              </TrustCopy>
            </TrustBox>
          </InfoPanel>

          <Card onSubmit={handleSubmit} noValidate>
            <FormHeader>
              <FormKicker>Secure Message Form</FormKicker>
              <FormTitle>Tell us exactly what you need.</FormTitle>
              <FormText>
                Complete details help us protect your account and answer faster.
              </FormText>
            </FormHeader>

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

            {isAdmin ? (
              <Alert $state="error" role="status" aria-live="polite">
                Admin accounts cannot submit public contact requests. Use the
                admin dashboard to manage messages.
              </Alert>
            ) : null}

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
                  disabled={isAdmin}
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
                  disabled={isAdmin}
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
                  disabled={isAdmin}
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
                  placeholder="Order / Membership / Partnership / Support"
                  value={form?.subject || ""}
                  onChange={handleChange}
                  aria-invalid={!!errors.subject}
                  aria-describedby={errors.subject ? "err-subject" : undefined}
                  minLength={2}
                  maxLength={300}
                  disabled={isAdmin}
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
                placeholder="Tell us what happened, what you need, and include any order, product, membership, or account details that can help us respond faster."
                value={form?.message || ""}
                onChange={handleChange}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "err-message" : undefined}
                minLength={10}
                maxLength={2500}
                disabled={isAdmin}
                required
              />
              <Counter>{String(form?.message || "").length}/2500</Counter>
              {errors.message && (
                <Error id="err-message">{errors.message}</Error>
              )}
            </Field>

            <SecurityLine>
              <SecurityDot $ready={powReady && !powBusy && !isAdmin} />
              {isAdmin
                ? "Admin submission blocked"
                : powBusy
                  ? "Running premium security check…"
                  : powReady
                    ? "Security ready"
                    : "Preparing security check…"}
            </SecurityLine>

            <Actions>
              <Submit disabled={isBusy} type="submit">
                {isAdmin
                  ? "Admin Blocked"
                  : isBusy
                    ? "Sending…"
                    : "Send Message"}
                <Shimmer />
              </Submit>

              <Note>Clear requests receive faster support.</Note>
            </Actions>
          </Card>
        </Layout>
      </Inner>
    </Wrap>
  );
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(214,182,159,.45); }
  70% { box-shadow: 0 0 0 18px rgba(214,182,159,0); }
  100% { box-shadow: 0 0 0 0 rgba(214,182,159,0); }
`;

const sheen = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -18px, 0); }
`;

const Wrap = styled.section`
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 7rem 1.25rem 5rem;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
      circle at 15% 10%,
      rgba(214, 182, 159, 0.2),
      transparent 34%
    ),
    radial-gradient(
      circle at 85% 15%,
      rgba(255, 249, 242, 0.1),
      transparent 34%
    ),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown},
      ${({ theme }) => theme.colors.cocoa} 52%,
      ${({ theme }) => theme.colors.black}
    );
`;

const LuxuryGlowOne = styled.div`
  position: absolute;
  width: 480px;
  height: 480px;
  left: -190px;
  top: 110px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(22px);
  animation: ${float} 7s ease-in-out infinite;
`;

const LuxuryGlowTwo = styled.div`
  position: absolute;
  width: 420px;
  height: 420px;
  right: -170px;
  bottom: 80px;
  border-radius: 999px;
  background: rgba(255, 249, 242, 0.09);
  filter: blur(24px);
  animation: ${float} 8s ease-in-out infinite reverse;
`;

const PatternOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.28;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at center, black, transparent 72%);
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
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
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(16px);

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
  font-weight: 950;
  letter-spacing: 0.5px;
  animation: ${pulseRing} 2.4s infinite;
`;

const HookText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
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
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.78rem;
`;

const Title = styled.h1`
  max-width: 980px;
  margin: 0 auto 0.85rem;
  font-size: clamp(2.3rem, 5.8vw, 5.2rem);
  line-height: 0.95;
  letter-spacing: -0.065em;
  color: ${({ theme }) => theme.colors.ivory};
  text-shadow: 0 20px 38px rgba(0, 0, 0, 0.42);

  span {
    display: inline-block;
    background: linear-gradient(
      120deg,
      ${({ theme }) => theme.colors.ivory},
      ${({ theme }) => theme.colors.lightBrown}
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const Subtitle = styled.p`
  margin: 0 auto;
  max-width: 820px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 1.05rem;
  line-height: 1.75;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 0.86fr 1.14fr;
  gap: 1.1rem;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const InfoPanel = styled.aside`
  position: relative;
  overflow: hidden;
  padding: 1.4rem;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(214, 182, 159, 0.13), rgba(0, 0, 0, 0.34)),
    rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);

  &::before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.12),
      transparent 36%,
      rgba(214, 182, 159, 0.08)
    );
  }
`;

const PanelTop = styled.div`
  position: relative;
  z-index: 1;
`;

const PanelBadge = styled.div`
  width: fit-content;
  padding: 0.45rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.colors.black};
  background: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.74rem;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  margin: 1rem 0 0.55rem;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.55rem, 3vw, 2.25rem);
  line-height: 1;
  letter-spacing: -0.045em;
`;

const PanelText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  line-height: 1.65;
`;

const FeatureList = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  margin-top: 1.2rem;
`;

const FeatureItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  padding: 0.95rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 249, 242, 0.09);

  strong {
    color: ${({ theme }) => theme.colors.ivory};
    font-weight: 950;
  }

  p {
    margin: 0.3rem 0 0;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.66;
    line-height: 1.45;
    font-size: 0.9rem;
  }
`;

const FeatureIcon = styled.span`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.black};
  background: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
`;

const TrustBox = styled.div`
  position: relative;
  z-index: 1;
  margin-top: 1.2rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 249, 242, 0.08);
  border: 1px solid rgba(255, 249, 242, 0.12);
`;

const TrustNumber = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 2.2rem;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const TrustCopy = styled.p`
  margin: 0.25rem 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.74;
  line-height: 1.45;
`;

const Card = styled.form`
  position: relative;
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.085),
      rgba(255, 255, 255, 0.032)
    ),
    rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 249, 242, 0.13);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);

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

const FormHeader = styled.div`
  position: relative;
  z-index: 1;
`;

const FormKicker = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const FormTitle = styled.h2`
  margin: 0.45rem 0 0.3rem;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.035em;
`;

const FormText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  line-height: 1.55;
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
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;

  @media (min-width: 720px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Field = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.45rem;

  ${({ $full }) =>
    $full &&
    css`
      grid-column: 1 / -1;
    `}
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.94rem;
  opacity: 0.92;
  font-weight: 850;
`;

const fieldStyles = css`
  width: 100%;
  border-radius: 16px;
  padding: 0.98rem 1rem;
  outline: none;
  border: 1px solid rgba(255, 249, 242, 0.13);
  background: rgba(0, 0, 0, 0.3);
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
    color: rgba(255, 249, 242, 0.45);
  }

  &:hover {
    border-color: rgba(255, 249, 242, 0.24);
    background: rgba(0, 0, 0, 0.36);
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow:
      0 0 0 4px rgba(214, 182, 159, 0.18),
      inset 0 -20px 40px rgba(255, 255, 255, 0.04);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
  min-height: 180px;
  line-height: 1.65;
`;

const Counter = styled.span`
  justify-self: end;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.58;
  font-size: 0.8rem;
`;

const SecurityLine = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  width: fit-content;
  margin-top: 0.25rem;
  padding: 0.55rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  font-size: 0.92rem;
`;

const SecurityDot = styled.span`
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: ${({ $ready }) => ($ready ? "#65ff9a" : "#ffd166")};
  box-shadow: ${({ $ready }) =>
    $ready
      ? "0 0 18px rgba(101,255,154,.65)"
      : "0 0 18px rgba(255,209,102,.55)"};
`;

const Actions = styled.div`
  position: relative;
  z-index: 1;
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
  min-height: 50px;
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
    opacity: 0.62;
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
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  font-size: 0.92rem;
`;

const Error = styled.span`
  color: #ffb3b3;
  font-size: 0.85rem;
  font-weight: 750;
`;

const Alert = styled.div`
  position: relative;
  z-index: 1;
  margin-bottom: 0.2rem;
  border-radius: 16px;
  padding: 0.95rem 1rem;
  color: ${({ theme }) => theme.colors.ivory};
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
