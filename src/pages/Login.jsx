// src/pages/Login.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const AUTH_REDIRECT_BLOCKLIST = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function safeGetLocalStorage(key) {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeRemoveLocalStorage(key) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors safely.
  }
}

function getSafeRedirectTarget(from, fallback = "/user-profile") {
  if (typeof from !== "string") return fallback;

  const trimmed = from.trim();

  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;

  const basePath = trimmed.split("?")[0].split("#")[0];
  if (AUTH_REDIRECT_BLOCKLIST.has(basePath)) return fallback;

  return trimmed;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isAdmin, user, initializing } = useAuth();
  const toast = useToast();

  const pushToast = React.useCallback(
    (payload) => {
      if (!payload) return;

      const hasStandardShape =
        typeof payload.title === "string" ||
        typeof payload.description === "string";

      const normalized = hasStandardShape
        ? {
            title: payload.title || "Notice",
            description: payload.description || "",
            variant: payload.variant || "info",
          }
        : {
            title:
              payload.type === "success"
                ? "Success"
                : payload.type === "error"
                  ? "Error"
                  : payload.type === "warning"
                    ? "Warning"
                    : payload.type === "info"
                      ? "Info"
                      : "Notice",
            description: payload.message || "",
            variant: payload.type || "info",
          };

      toast?.push?.(normalized);
    },
    [toast],
  );

  const [email, setEmail] = React.useState(() => {
    return normalizeEmail(location.state?.registeredEmail || "");
  });

  const [password, setPassword] = React.useState("");
  const [mfaToken, setMfaToken] = React.useState("");
  const [requiresMfa, setRequiresMfa] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const didRoute = React.useRef(false);
  const submitLockRef = React.useRef(false);

  const registeredEmail = React.useMemo(() => {
    return normalizeEmail(
      location.state?.registeredEmail ||
        safeGetLocalStorage("lastRegisteredEmail"),
    );
  }, [location.state?.registeredEmail]);

  const needsEmailVerification = Boolean(
    location.state?.needsEmailVerification,
  );

  const verificationNotice = React.useMemo(() => {
    if (!needsEmailVerification) return "";

    if (registeredEmail) {
      return `Account created successfully. Please verify your email using the link sent to ${registeredEmail} before logging in.`;
    }

    return "Account created successfully. Please verify your email using the link sent to your email before logging in.";
  }, [needsEmailVerification, registeredEmail]);

  React.useEffect(() => {
    if (didRoute.current) return;
    if (initializing) return;
    if (!isAuthenticated) return;

    const role = user?.role || (isAdmin ? "admin" : "user");
    const fallback = role === "admin" ? "/admin/dashboard" : "/user-profile";
    const target = getSafeRedirectTarget(location?.state?.from, fallback);

    if (window.location.pathname !== target) {
      didRoute.current = true;
      navigate(target, { replace: true });
    }
  }, [
    isAuthenticated,
    isAdmin,
    user?.role,
    navigate,
    location?.state?.from,
    initializing,
  ]);

  const mfaInputRef = React.useRef(null);

  React.useEffect(() => {
    if (requiresMfa) {
      setTimeout(() => {
        mfaInputRef.current?.focus?.();
        mfaInputRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [requiresMfa]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (submitLockRef.current || submitting) return;

    setError("");

    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) {
      const msg = "Please enter both email and password.";
      setError(msg);
      pushToast({ type: "warning", message: msg });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      pushToast({ type: "warning", message: msg });
      return;
    }

    try {
      submitLockRef.current = true;
      setSubmitting(true);

      pushToast({ type: "info", message: "Signing you in…" });

      const result = await login(
        {
          email: cleanEmail,
          password: cleanPassword,
          mfaToken,
        },
        { remember },
      );

      if (result?.code === "ACCOUNT_ACCESS_RESTRICTED") {
        const restrictedMessage =
          result?.message ||
          result?.error ||
          "Your account access has been restricted. Please contact support.";

        const restrictedStatus = result?.accountStatus || "restricted";

        localStorage.setItem("accountAccessMessage", restrictedMessage);
        localStorage.setItem("accountStatus", restrictedStatus);

        navigate("/account-access-notice", {
          replace: true,
          state: {
            message: restrictedMessage,
            accountStatus: restrictedStatus,
          },
        });

        return;
      }

      //=========
      if (result?.code === "MFA_REQUIRED") {
        setRequiresMfa(true);
        setMfaToken("");

        const msg = "Enter your authenticator app code.";

        setError(msg);

        pushToast({
          type: "info",
          message: msg,
        });

        setTimeout(() => {
          document.getElementById("login-mfa")?.focus();
          document.getElementById("login-mfa")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 150);

        return;
      }

      if (!result?.ok) {
        const msg =
          result?.code === "ACCOUNT_LOCKED"
            ? "Your account is temporarily locked because of too many failed attempts. Please wait and try again later."
            : result?.code === "EMAIL_NOT_VERIFIED"
              ? "Please verify your email before logging in."
              : result?.error && !/not found|no user/i.test(result.error)
                ? result.error
                : "Invalid email or password.";

        setError(msg);
        pushToast({ type: "error", message: msg });
        return;
      }

      const loggedInUser = result?.user;

      if (loggedInUser && loggedInUser.isActive === false) {
        const msg =
          "Your account is currently inactive. Please contact support for assistance.";

        localStorage.setItem("accountAccessMessage", msg);
        localStorage.setItem("accountStatus", "inactive");

        navigate("/account-access-notice", {
          replace: true,
          state: {
            message: msg,
            accountStatus: "inactive",
          },
        });

        return;
      }

      safeRemoveLocalStorage("lastRegisteredEmail");
      safeRemoveLocalStorage("accountAccessMessage");
      safeRemoveLocalStorage("accountStatus");

      pushToast({
        type: "success",
        message: "Login successful. Redirecting to your dashboard…",
      });

      const role = result?.role || loggedInUser?.role || "user";
      const fallback = role === "admin" ? "/admin/dashboard" : "/user-profile";
      const target = getSafeRedirectTarget(location?.state?.from, fallback);

      didRoute.current = true;
      navigate(target, { replace: true });
    } catch (error) {
      const data = error?.response?.data;

      if (data?.code === "ACCOUNT_ACCESS_RESTRICTED") {
        const restrictedMessage =
          data?.message ||
          "Your account access has been restricted. Please contact support.";

        const restrictedStatus = data?.accountStatus || "restricted";

        localStorage.setItem("accountAccessMessage", restrictedMessage);
        localStorage.setItem("accountStatus", restrictedStatus);

        navigate("/account-access-notice", {
          replace: true,
          state: {
            message: restrictedMessage,
            accountStatus: restrictedStatus,
          },
        });

        return;
      }

      const msg = "Login failed. Please try again.";
      setError(msg);
      pushToast({ type: "error", message: msg });
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const isBusy = submitting;
  const canSubmit = Boolean(normalizeEmail(email) && password && !isBusy);

  return (
    <Wrap>
      <BackgroundGlow />

      <Shell>
        <HeroPanel>
          <Kicker>KnockoutCodes Access</Kicker>

          <HeroTitle>
            Step into your private training and business command center.
          </HeroTitle>

          <HeroText>
            Login to manage your courses, profile, progress, orders, and admin
            tools with a secure premium dashboard experience.
          </HeroText>

          <HeroStats>
            <Stat>
              <strong>Secure</strong>
              <span>Protected account access</span>
            </Stat>

            <Stat>
              <strong>Fast</strong>
              <span>Clean dashboard routing</span>
            </Stat>

            <Stat>
              <strong>Elite</strong>
              <span>Built for serious winners</span>
            </Stat>
          </HeroStats>
        </HeroPanel>

        <Card>
          <Form onSubmit={handleSubmit} aria-label="login form" noValidate>
            <FormTop>
              <MiniBadge>Member Login</MiniBadge>
              <Legend>Welcome back, champion.</Legend>
              <SubHeading>
                Sign in and continue where winners separate from average.
              </SubHeading>
            </FormTop>

            {verificationNotice ? (
              <VerifyNotice role="status" aria-live="polite">
                <strong>Verify your email first</strong>
                <p>{verificationNotice}</p>
              </VerifyNotice>
            ) : null}

            {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}

            <Field>
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@domain.com"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <PasswordField>
              <label htmlFor="login-password">Password</label>

              <div className="input-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <ToggleButton
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </ToggleButton>
              </div>
            </PasswordField>

            {requiresMfa ? (
              <Field>
                <label htmlFor="login-mfa">Authenticator or Backup Code</label>

                <input
                  ref={mfaInputRef}
                  id="login-mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456 or backup code"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                />
              </Field>
            ) : null}

            <Row>
              <Check>
                <input
                  id="remember-login"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label htmlFor="remember-login">Remember me</label>
              </Check>

              <StyledLink to="/forgot-password">Forgot password?</StyledLink>
            </Row>

            <Button
              type="submit"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              {isBusy
                ? "Signing you in…"
                : requiresMfa
                  ? "Verify Code"
                  : "Enter Dashboard"}
            </Button>

            <Meta>
              <span>New here?</span>
              <StyledLink to="/register">Create account</StyledLink>
            </Meta>

            <Hint>
              <strong>Admins:</strong> routed to admin dashboard.{" "}
              <strong>Users:</strong> routed to profile/dashboard area.
            </Hint>
          </Form>
        </Card>
      </Shell>
    </Wrap>
  );
}

/* ============ styled ============ */

const floatGlow = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.72; }
  50% { transform: translate3d(-18px, 14px, 0) scale(1.06); opacity: 1; }
`;

const Wrap = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 52px 24px;
  overflow: hidden;

  background:
    radial-gradient(
      900px 500px at 8% 0%,
      rgba(214, 182, 159, 0.22),
      transparent 58%
    ),
    radial-gradient(
      720px 420px at 95% 8%,
      rgba(255, 249, 242, 0.12),
      transparent 62%
    ),
    linear-gradient(
      145deg,
      ${({ theme }) => theme.colors.black} 0%,
      ${({ theme }) => theme.colors.darkBrown} 42%,
      ${({ theme }) => theme.colors.cocoa} 100%
    );

  @media (max-width: 680px) {
    padding: 34px 16px;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 340px;
  height: 340px;
  right: -110px;
  bottom: -110px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(38px);
  animation: ${floatGlow} 7s ease-in-out infinite;
  z-index: -1;
`;

const Shell = styled.div`
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: 1fr 520px;
  gap: 26px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    max-width: 620px;
  }
`;

const HeroPanel = styled.aside`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 38px;
  min-height: 560px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.82)),
    radial-gradient(
      circle at 20% 10%,
      rgba(214, 182, 159, 0.28),
      transparent 42%
    ),
    linear-gradient(135deg, rgba(90, 56, 37, 0.78), rgba(0, 0, 0, 0.92));

  border: 1px solid rgba(214, 182, 159, 0.2);
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &::before {
    content: "KC";
    position: absolute;
    top: 34px;
    right: 34px;
    font-size: 8rem;
    font-weight: 950;
    letter-spacing: -0.08em;
    color: rgba(255, 255, 255, 0.035);
    pointer-events: none;
  }

  @media (max-width: 980px) {
    min-height: auto;
    padding: 28px;
  }

  @media (max-width: 560px) {
    display: none;
  }
`;

const Kicker = styled.div`
  width: fit-content;
  margin-bottom: 16px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.34);
  background: rgba(0, 0, 0, 0.26);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const HeroTitle = styled.h1`
  max-width: 720px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(2rem, 5vw, 4.35rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
`;

const HeroText = styled.p`
  max-width: 620px;
  margin: 18px 0 0;
  color: rgba(255, 249, 242, 0.74);
  font-size: 1rem;
  line-height: 1.75;
`;

const HeroStats = styled.div`
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Stat = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.14);
  background: rgba(0, 0, 0, 0.28);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 0.86rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  span {
    display: block;
    margin-top: 6px;
    color: rgba(255, 249, 242, 0.6);
    font-size: 0.78rem;
    line-height: 1.4;
  }
`;

const Card = styled.div`
  width: 100%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.035)
  );
  border: 1px solid rgba(214, 182, 159, 0.18);
  backdrop-filter: blur(18px);
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 14px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Form = styled.form`
  position: relative;
  display: grid;
  gap: 18px;
  min-height: 100%;
  padding: 30px;
  border-radius: calc(${({ theme }) => theme.radius.xl} - 8px);
  overflow: hidden;

  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(214, 182, 159, 0.16),
      transparent 34%
    ),
    linear-gradient(180deg, rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0.28));

  border: 1px solid rgba(255, 255, 255, 0.08);

  &::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(214, 182, 159, 0.7),
      transparent 34%,
      rgba(255, 249, 242, 0.18)
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @media (max-width: 520px) {
    padding: 22px;
  }
`;

const FormTop = styled.div`
  display: grid;
  gap: 8px;
`;

const MiniBadge = styled.span`
  width: fit-content;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.3);
  background: rgba(214, 182, 159, 0.1);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Legend = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.25rem);
  letter-spacing: -0.06em;
  font-weight: 950;
  line-height: 0.95;

  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const SubHeading = styled.p`
  margin: 0 0 4px;
  font-size: 0.92rem;
  line-height: 1.65;
  color: rgba(255, 249, 242, 0.72);
`;

const VerifyNotice = styled.div`
  background: rgba(214, 182, 159, 0.13);
  border: 1px solid rgba(214, 182, 159, 0.4);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);

  strong {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.82rem;
    font-weight: 950;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  p {
    margin: 0;
    color: rgba(255, 249, 242, 0.78);
    font-size: 0.88rem;
    line-height: 1.55;
  }
`;

const ErrorBox = styled.div`
  background: rgba(255, 74, 74, 0.12);
  border: 1px solid rgba(255, 74, 74, 0.35);
  color: #ffdede;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
`;

const Field = styled.div`
  display: grid;
  gap: 10px;

  label {
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 249, 242, 0.82);
  }

  input {
    width: 100%;
    height: 52px;
    border-radius: ${({ theme }) => theme.radius.md};
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(0, 0, 0, 0.34);
    color: ${({ theme }) => theme.colors.ivory};
    padding: 0 14px;
    outline: none;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease,
      transform 0.12s ease,
      background 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.38);
    }

    &:hover {
      border-color: rgba(214, 182, 159, 0.54);
      background: rgba(0, 0, 0, 0.42);
    }

    &:focus {
      border-color: ${({ theme }) => theme.colors.lightBrown};
      box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.18);
      transform: translateY(-1px);
    }
  }
`;

const PasswordField = styled(Field)`
  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    padding-right: 78px;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  transition: 0.18s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.14);
    border-color: rgba(214, 182, 159, 0.46);
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  @media (max-width: 430px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Check = styled.div`
  display: inline-flex;
  gap: 9px;
  align-items: center;
  color: rgba(255, 249, 242, 0.78);
  font-size: 0.88rem;

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.lightBrown};
    cursor: pointer;
  }

  label {
    cursor: pointer;
  }
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors.lightBrown};
  text-decoration: none;
  font-weight: 850;
  border-bottom: 1px dashed transparent;
  transition: 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    opacity: 0.9;
  }
`;

const Button = styled.button`
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: radial-gradient(
    120% 160% at 10% 0%,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown} 42%,
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
    transform: none;
    filter: none;
  }
`;

const Meta = styled.div`
  display: flex;
  gap: 10px;
  font-size: 0.9rem;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  color: rgba(255, 249, 242, 0.76);
`;

const Hint = styled.p`
  margin: 4px 0 0;
  font-size: 0.76rem;
  line-height: 1.6;
  color: rgba(255, 249, 242, 0.58);
  text-align: center;
`;
