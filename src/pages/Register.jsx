// src/pages/Register.jsx
import React, { useState, useMemo, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  updateRegisterField,
  setRegisterError,
  clearRegisterError,
  registerRequest,
  registerSuccess,
  registerFail,
  resetRegister,
} from "../reducers/register/registerActions";

const LOGIN_ROUTE = "/login";

const floatGlow = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.72; }
  50% { transform: translate3d(-18px, 14px, 0) scale(1.06); opacity: 1; }
`;

const pulseIn = keyframes`
  from { transform: translateY(14px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { register: registerWithCtx } = useAuth();

  const { form, error, loading } = useSelector((state) => state.register);

  const ids = useMemo(
    () => ({
      name: "register_name",
      email: "register_email",
      password: "register_password",
      confirmPassword: "register_confirm_password",
    }),
    []
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(resetRegister());
    };
  }, [dispatch]);

  function fail(message) {
    dispatch(setRegisterError(message));
    showToast(message, "error");
  }

  function onChange(e) {
    dispatch(updateRegisterField(e.target.name, e.target.value));
  }

  async function onSubmit(e) {
    e.preventDefault();
    dispatch(clearRegisterError());

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      fail("Please fill all fields.");
      return;
    }

    if (form.password.length < 8) {
      fail("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      fail("Passwords do not match.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    try {
      dispatch(registerRequest());

      const result = await registerWithCtx(payload, { remember: true });

      if (!result?.ok) {
        const message = result?.error || "Registration failed.";
        dispatch(registerFail(message));
        showToast(message, "error");
        return;
      }

      dispatch(registerSuccess());
      showToast("Account created successfully. Please log in.", "success");

      localStorage.setItem("lastRegisteredEmail", payload.email);

      navigate(LOGIN_ROUTE, {
        replace: true,
        state: { registeredEmail: payload.email },
      });
    } catch {
      const message = "Network error. Please try again.";
      dispatch(registerFail(message));
      showToast(message, "error");
    }
  }

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.password.length >= 8 &&
    !loading;

  return (
    <Screen>
      <BackgroundGlow />

      <Shell>
        <BrandPanel>
          <Badge>Exclusive Access</Badge>

          <Hook>Join the inner circle.</Hook>

          <Sub>
            Create your KnockoutCodes account and unlock your private dashboard,
            training tools, courses, coaching access, and premium member area.
          </Sub>

          <PowerGrid>
            <PowerCard>
              <strong>Secure</strong>
              <span>Protected account onboarding</span>
            </PowerCard>

            <PowerCard>
              <strong>Premium</strong>
              <span>Built for serious members</span>
            </PowerCard>

            <PowerCard>
              <strong>Fast</strong>
              <span>Create access in seconds</span>
            </PowerCard>
          </PowerGrid>

          <BrandFoot>
            <span>
              Already have an account? <Link to="/login">Log in</Link>
            </span>
            <span>
              Need help? <Link to="/support">Contact support</Link>
            </span>
          </BrandFoot>
        </BrandPanel>

        <Panel>
          <Form onSubmit={onSubmit} noValidate>
            <FormTop>
              <MiniBadge>Start Strong</MiniBadge>
              <Title>Create your account</Title>
              <Caption>
                Premium access for users and admins. Clean, secure, and built
                to move like a serious platform.
              </Caption>
            </FormTop>

            {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}

            <Row>
              <Field>
                <label htmlFor={ids.name}>Full name</label>
                <div className="input-wrap">
                  <input
                    id={ids.name}
                    name="name"
                    type="text"
                    placeholder="e.g. Yakubu Amidu"
                    value={form.name}
                    onChange={onChange}
                    autoComplete="name"
                  />
                </div>
              </Field>

              <Field>
                <label htmlFor={ids.email}>Email address</label>
                <div className="input-wrap">
                  <input
                    id={ids.email}
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={onChange}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </Field>
            </Row>

            <Row>
              <Field>
                <label htmlFor={ids.password}>Password</label>
                <div className="input-wrap">
                  <input
                    id={ids.password}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={onChange}
                    autoComplete="new-password"
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
              </Field>

              <Field>
                <label htmlFor={ids.confirmPassword}>Confirm password</label>
                <div className="input-wrap">
                  <input
                    id={ids.confirmPassword}
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-type password"
                    value={form.confirmPassword}
                    onChange={onChange}
                    autoComplete="new-password"
                  />

                  <ToggleButton
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </ToggleButton>
                </div>
              </Field>
            </Row>

            <Submit type="submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
              {loading ? "Creating account…" : "Create Premium Access"}
            </Submit>

            <Minor>
              By creating an account, you agree to our{" "}
              <Link to="/terms">Terms</Link> and{" "}
              <Link to="/privacy">Privacy Policy</Link>.
            </Minor>

            <LoginLine>
              <span>Already registered?</span>
              <Link to="/login">Login here</Link>
            </LoginLine>

            <LinkGroups>
              <div className="group">
                <Link to="/">Home</Link>
                <Link to="/courses">Courses</Link>
                <Link to="/coachings">1-on-1 Coaching</Link>
                <Link to="/ebooks">E-book</Link>
              </div>

              <div className="group">
                <Link to="/about">About</Link>
                <Link to="/careers">Careers</Link>
                <Link to="/press">Press</Link>
                <Link to="/support">Support</Link>
              </div>
            </LinkGroups>
          </Form>
        </Panel>
      </Shell>
    </Screen>
  );
}

/* =========================
   Styles
========================= */

const Screen = styled.div`
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 54px 22px;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.white};

  background:
    radial-gradient(
      900px 500px at 8% 0%,
      rgba(214, 182, 159, 0.23),
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
  width: 360px;
  height: 360px;
  right: -120px;
  bottom: -120px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(40px);
  animation: ${floatGlow} 7s ease-in-out infinite;
  z-index: -1;
`;

const Shell = styled.div`
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: 1fr 1.06fr;
  gap: 26px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    max-width: 720px;
  }
`;

const BrandPanel = styled.aside`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 40px;
  min-height: 620px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.84)),
    radial-gradient(
      circle at 18% 10%,
      rgba(214, 182, 159, 0.3),
      transparent 43%
    ),
    linear-gradient(
      135deg,
      rgba(90, 56, 37, 0.82),
      rgba(0, 0, 0, 0.92)
    );

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
    padding: 30px;
  }

  @media (max-width: 560px) {
    display: none;
  }
`;

const Badge = styled.div`
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

const Hook = styled.h1`
  max-width: 760px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
  text-transform: uppercase;
  animation: ${pulseIn} 0.7s ease both;
`;

const Sub = styled.p`
  max-width: 620px;
  margin: 18px 0 0;
  color: rgba(255, 249, 242, 0.74);
  font-size: 1rem;
  line-height: 1.75;
`;

const PowerGrid = styled.div`
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const PowerCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.14);
  background: rgba(0, 0, 0, 0.28);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 0.84rem;
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

const BrandFoot = styled.div`
  margin-top: 28px;
  display: grid;
  gap: 10px;
  color: rgba(255, 249, 242, 0.78);
  font-size: 0.9rem;

  a {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-decoration: none;
    font-weight: 850;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const Panel = styled.div`
  width: 100%;
  background:
    linear-gradient(
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
    -webkit-mask: linear-gradient(#000 0 0) content-box,
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

const Title = styled.h2`
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.15rem);
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

const Caption = styled.p`
  margin: 0 0 4px;
  font-size: 0.92rem;
  line-height: 1.65;
  color: rgba(255, 249, 242, 0.72);
`;

const ErrorBox = styled.div`
  background: rgba(255, 74, 74, 0.12);
  border: 1px solid rgba(255, 74, 74, 0.35);
  color: #ffdede;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
`;

const Row = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
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

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
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
    transition: box-shadow 0.2s ease, border-color 0.2s ease,
      transform 0.12s ease, background 0.2s ease;

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

  .input-wrap:has(button) input {
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

const Submit = styled.button`
  height: 54px;
  margin-top: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    radial-gradient(
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
  transition: transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease,
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
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  filter: grayscale(20%);
  box-shadow: none;
}
`;

const Minor = styled.p`
  margin: 2px 0 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: rgba(255, 249, 242, 0.58);
  text-align: center;

  a {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-decoration: none;
    font-weight: 850;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const LoginLine = styled.p`
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 249, 242, 0.76);
  font-size: 0.9rem;

  a {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-decoration: none;
    font-weight: 850;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const LinkGroups = styled.div`
  margin-top: 8px;
  display: grid;
  gap: 12px;

  .group {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;

    a {
      color: ${({ theme }) => theme.colors.ivory};
      opacity: 0.82;
      text-decoration: none;
      padding: 7px 10px;
      border-radius: ${({ theme }) => theme.radius.pill};
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.78rem;
      transition: 0.18s ease;
    }

    a:hover {
      opacity: 1;
      border-color: rgba(214, 182, 159, 0.48);
      background: rgba(214, 182, 159, 0.1);
    }
  }
`;