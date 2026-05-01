// src/components/Footer.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useToast } from "./Toast";
import axiosInstance from "../../utils/axiosInstance";

// ✅ Redux
import { useDispatch, useSelector } from "react-redux";
import {
  subscribeToNewsletter,
  resetNewsletterSubscribe,
} from "../reducers/newsletter/newsletterActions";

const LS_SUB_KEY = "newsletter_subscribed_email_v1";
const LS_SUB_TS_KEY = "newsletter_subscribed_ts_v1";

const Wrap = styled.footer`
  margin-top: auto;
  background: radial-gradient(
      1200px 520px at 12% 0%,
      rgba(214, 182, 159, 0.18),
      transparent 56%
    ),
    radial-gradient(
      900px 420px at 88% 18%,
      rgba(255, 249, 242, 0.09),
      transparent 60%
    ),
    linear-gradient(
      160deg,
      ${({ theme }) => theme.colors.brown} 0%,
      ${({ theme }) => theme.colors.cocoa} 60%,
      #000 100%
    );
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.white};
  font-size: 15.5px;
  letter-spacing: 0.2px;
`;

const Container = styled.div`
  width: min(1180px, 92%);
  margin: 0 auto;
`;

const Top = styled.div`
  padding: 34px 0 18px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.25fr repeat(3, 1fr);
  gap: 18px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Brand = styled.div`
  display: grid;
  gap: 10px;

  .kicker {
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  .name {
    font-weight: 950;
    letter-spacing: 0.6px;
    font-size: 18px;
    background: linear-gradient(
      120deg,
      ${({ theme }) => theme.colors.lightBrown},
      ${({ theme }) => theme.colors.ivory}
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1.1;
  }

  .tagline {
    opacity: 0.92;
    color: rgba(255, 249, 242, 0.9);
  }

  .desc {
    opacity: 0.88;
    color: rgba(255, 249, 242, 0.86);
    line-height: 1.5;
  }
`;

const Col = styled.div`
  h4 {
    margin: 0 0 10px 0;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.95;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }

  a {
    position: relative;
    display: inline-block;
    padding: 6px 0 7px;
    border-radius: 6px;
    transition: transform 0.15s ease, opacity 0.2s ease;
    opacity: 0.95;
  }

  a::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.5px;
    background: rgba(255, 255, 255, 0);
    transform: scaleX(0.2);
    transform-origin: left;
    transition: transform 0.25s ease, background 0.25s ease;
  }

  a:hover {
    transform: translateY(-1px);
    opacity: 1;
  }

  a:hover::after {
    background: ${({ theme }) => theme.colors.lightBrown};
    transform: scaleX(1);
  }
`;

const SubscribeCard = styled.form`
  display: grid;
  gap: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(14px);

  label {
    font-size: 13.5px;
    opacity: 0.95;
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  small {
    opacity: 0.82;
    line-height: 1.45;
    color: rgba(255, 249, 242, 0.86);
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.white};
  border: 1px solid rgba(255, 255, 255, 0.14);
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.65);
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    background: rgba(0, 0, 0, 0.34);
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.4);
  }
`;

const Button = styled.button`
  padding: 11px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.lightBrown},
    #e3cdbb
  );
  color: ${({ theme }) => theme.colors.black};
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease,
    opacity 0.2s ease;
  white-space: nowrap;
  font-weight: 750;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 8px 0 0 0;
`;

const Bottom = styled.div`
  padding: 14px 0 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Left = styled.small`
  flex: 0 0 auto;
  opacity: 0.9;
`;

const Links = styled.nav`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;

  a {
    position: relative;
    padding: 6px 2px;
    transition: transform 0.15s ease, opacity 0.2s ease;
    opacity: 0.95;
  }

  a::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.5px;
    background: rgba(255, 255, 255, 0);
    transform: scaleX(0.2);
    transform-origin: left;
    transition: transform 0.25s ease, background 0.25s ease;
  }

  a:hover {
    transform: translateY(-1px);
    opacity: 1;
  }

  a:hover::after {
    background: ${({ theme }) => theme.colors.lightBrown};
    transform: scaleX(1);
  }
`;

const Dot = styled.span`
  flex: 0 0 auto;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  margin: 0 2px;
`;

const Socials = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;

  a {
    position: relative;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: transform 0.15s ease, background 0.2s ease, opacity 0.2s ease,
      box-shadow 0.25s ease;
    opacity: 0.95;
    color: ${({ theme }) => theme.colors.white};
  }

  a:hover {
    transform: translateY(-1px);
    background: rgba(0, 0, 0, 0.14);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
    opacity: 1;
  }

  i {
    font-size: 16px;
    line-height: 1;
  }
`;

const Status = styled.small`
  margin-top: 2px;
  line-height: 1.35;
  color: ${({ $type }) =>
    $type === "error"
      ? "#fecaca"
      : $type === "success"
      ? "#bbf7d0"
      : $type === "info"
      ? "rgba(255,249,242,0.9)"
      : "rgba(255,249,242,0.85)"};
`;

export default function Footer() {
  const toast = useToast();
  const dispatch = useDispatch();

  // ✅ Redux state (users newsletter slice)
  const newsletterState = useSelector((s) => s.newsletter || {});
  const reduxLoading = Boolean(newsletterState.loading);

  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState({ type: null, text: "" });
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [mountedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  // ✅ NEW: track why we are cooling down (so button label can stay "Send" for already-subscribed)
  const [cooldownMode, setCooldownMode] = useState(null); // "already" | "rate" | "other" | null

useEffect(() => {
  if (!cooldownUntil) return;

  setNow(Date.now());

  const timer = setInterval(() => {
    const current = Date.now();
    setNow(current);

    if (current >= cooldownUntil) {
      clearInterval(timer);
    }
  }, 500);

  return () => clearInterval(timer);
}, [cooldownUntil]);

const isCoolingDown = now < cooldownUntil;

  // ✅ NEW: when cooldown ends, clear the mode (keeps UI clean)
  useEffect(() => {
    if (!isCoolingDown && cooldownMode) setCooldownMode(null);
  }, [isCoolingDown, cooldownMode]);

  useEffect(() => {
    // If user already subscribed previously, show a calm premium hint (no spam)
    try {
      const savedEmail = localStorage.getItem(LS_SUB_KEY);
      const savedTs = Number(localStorage.getItem(LS_SUB_TS_KEY) || "0");
      const fresh =
        savedEmail && Date.now() - savedTs < 1000 * 60 * 60 * 24 * 30; // 30 days
      if (fresh) {
        setStatus({ type: "info", text: "You’re already on the elite list." });
      }
    } catch {
      // ignore
    }
  }, []);

  // Keep your email validation exactly
  const validEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(val).trim());

  const handleSubscribe = async (e) => {
  e.preventDefault();

  if (submitting) return;
    setSubmitting(true);
    
    // bot timing protection
if (Date.now() - mountedAt < 1500) {
  setSubmitting(false);
  return;
}

  try {
    // honeypot triggered → pretend success (quietly)
    if (company) {
      setStatus({ type: "success", text: "Subscribed." });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // ✅ ADD HERE
if (!cleanEmail) {
  setSubmitting(false);
  return;
}

    if (!validEmail(cleanEmail)) {
      const text = "Please enter a valid email address.";
      setStatus({ type: "error", text });
      toast.push({
        title: "Invalid email",
        description: text,
        variant: "error",
        duration: 2800,
      });
      return;
    }

    if (isCoolingDown) {
      const text = "Please wait a moment before trying again.";
      setStatus({ type: "info", text });
      return;
    }

    // ✅ drive loading from redux
    setStatus({ type: "info", text: "Securing your spot…" });

    // clear previous redux status
    dispatch(resetNewsletterSubscribe());

    // ensure CSRF token exists (safe, silent)
    try {
      await axiosInstance.get("/auth/csrf");
    } catch {
      // ignore silently
    }

    // optional fail-safe timeout so UI does not hang forever
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000)
    );

    const result = await Promise.race([
      dispatch(
        subscribeToNewsletter(cleanEmail, {
          source: "footer",
          company: "",
          website: "",
        })
      ),
      timeout,
    ]);

    // result is returned from the thunk
    if (result?.ok) {
      const msg = "You’re in. Watch your inbox for elite drops.";
      setStatus({ type: "success", text: msg });

      try {
        localStorage.setItem(LS_SUB_KEY, cleanEmail);
        localStorage.setItem(LS_SUB_TS_KEY, String(Date.now()));
      } catch {
        // ignore
      }

      toast.push({
        title: "Subscribed!",
        description: msg,
        variant: "success",
        duration: 2800,
      });

      setEmail("");
      setCooldownMode("other");
      setCooldownUntil(Date.now() + 12_000); // 12s cool-down
      return;
    }

    // Handle known statuses
    if (result?.status === 409) {
      const msg = result?.message || "You’re already on the list.";
      setStatus({ type: "info", text: msg });

      toast.push({
        title: "Already subscribed",
        description: msg,
        variant: "info",
        duration: 2600,
      });

      setCooldownMode("already");
      setCooldownUntil(Date.now() + 8000);
      return;
    }

    if (result?.status === 429) {
      const msg = result?.message || "Too many attempts. Please wait.";
      setStatus({ type: "info", text: msg });

      toast.push({
        title: "Slow down",
        description: msg,
        variant: "info",
        duration: 2800,
      });

      setCooldownMode("rate");
      setCooldownUntil(Date.now() + 20_000);
      return;
    }

    // Default failure
    const msg = result?.message || "Subscription failed. Please try again.";
    setStatus({ type: "error", text: msg });

    toast.push({
      title: "Subscription failed",
      description: msg,
      variant: "error",
      duration: 3000,
    });

    setCooldownMode("other");
    setCooldownUntil(Date.now() + 6000);
  } catch (error) {
    const msg =
      error?.message === "timeout"
        ? "Network timeout. Please try again."
        : "Subscription failed. Please try again.";

    setStatus({ type: "error", text: msg });

    toast.push({
      title: error?.message === "timeout" ? "Connection issue" : "Subscription failed",
      description: msg,
      variant: "error",
      duration: 3000,
    });

    setCooldownMode("other");
    setCooldownUntil(Date.now() + 6000);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Wrap>
      <Container>
        <Top>
          <Grid>
            {/* Brand */}
            <Brand>
              <div className="kicker">Luxury • Discipline • Results</div>
              <div className="name">KnockoutCodes</div>
              <div className="tagline">Train • Fight • Win</div>
              <div className="desc">
                Elite boxing coaching, premium programs, and high-impact lessons.
                Book 1-on-1 sessions, take online courses, and download the e-book.
              </div>
            </Brand>

            {/* Explore */}
            <Col>
              <h4>Explore</h4>
              <ul>
                <li>
                  <Link to="/home">Home</Link>
                </li>
                <li>
                  <Link to="/products">Shop</Link>
                </li>
                <li>
                  <Link to="/courses">Couses</Link>
                </li>
                <li>
                  <Link to="/ebook">Ebooks</Link>
                </li>
              </ul>
            </Col>

            {/* Support */}
            <Col>
              <h4>Support</h4>
              <ul>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
                <li>
                  <Link to="/coaching">Coaching</Link>
                </li>
              </ul>
            </Col>

            {/* Newsletter */}
            <Col>
              <h4>Newsletter</h4>
              <SubscribeCard onSubmit={handleSubscribe} aria-live="polite">
                <label htmlFor="email">Get elite tips &amp; premium drops</label>

                {/* Honeypot (hidden) */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    height: 0,
                    width: 0,
                  }}
                  aria-hidden="true"
                />

                <div className="row">
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onBlur={() => {
  if (email && !validEmail(email)) {
    setStatus({ type: "error", text: "Invalid email format." });
  }
                    }}
                    onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSubscribe(e);
  }
}}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={reduxLoading || submitting || (isCoolingDown && cooldownMode !== "already")}
                    aria-invalid={status.type === "error" ? "true" : "false"}
                  />
                  <Button
                    type="submit"
                    aria-label="Subscribe"
                    // ✅ CHANGED: still disables during cooldown, but "already" cooldown won’t show "Please wait…"
                    disabled={
                      reduxLoading || (isCoolingDown && cooldownMode !== "already")
                    }
                  >
                    {reduxLoading
                      ? "Subscribing…"
                      : isCoolingDown && cooldownMode !== "already"
                      ? "Please wait…"
                      : "Send"}
                  </Button>
                </div>

                {status.text ? (
                  <Status $type={status.type} role="status" aria-atomic="true">
                    {status.text}
                  </Status>
                ) : null}

                <small>
                  By subscribing, you agree to our{" "}
                  <Link to="/terms">Terms</Link> &amp;{" "}
                  <Link to="/privacy">Privacy Policy</Link>.
                </small>
              </SubscribeCard>
            </Col>
          </Grid>
        </Top>

        <Divider />

        <Bottom aria-label="Site footer">
          <Left>
            © {new Date().getFullYear()} KnockoutCodes. All rights reserved.
          </Left>

          <Dot />

          <Links aria-label="Footer links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund-policy">Refunds</Link>
            <Link to="/contact">Contact</Link>
          </Links>

          <Dot />

          <Socials aria-label="Social links">
            <a
              href="https://x.com/knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
            >
              <i className="fa-brands fa-x-twitter" aria-hidden="true"></i>
            </a>
            <a
              href="https://instagram.com/knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram" aria-hidden="true"></i>
            </a>
            <a
              href="https://www.tiktok.com/@knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <i className="fa-brands fa-tiktok" aria-hidden="true"></i>
            </a>
            <a
              href="https://youtube.com/@knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <i className="fa-brands fa-youtube" aria-hidden="true"></i>
            </a>
            <a
              href="https://facebook.com/knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <i className="fa-brands fa-facebook-f" aria-hidden="true"></i>
            </a>
            <a
              href="https://www.linkedin.com/company/knockoutcodes"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <i className="fa-brands fa-linkedin-in" aria-hidden="true"></i>
            </a>
          </Socials>
        </Bottom>
      </Container>
    </Wrap>
  );
}
